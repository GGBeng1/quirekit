import { Extension, Mark, Node } from "@quirekit/core";
import { describe, expect, it, vi } from "vitest";
import { defineClassicEditorPlugin } from "../define";
import { defineComponent } from "vue";
import { resolveClassicEditorFeatures } from "./features";
import { createClassicEditorRegistry } from "./create";
import { collectClassicEditorPluginExtensions } from "./audience";

describe("Classic Editor contribution registry", () => {
  it("filters feature-bound contributions while retaining their real command", () => {
    const behavior = { execute: () => true };
    const plugin = defineClassicEditorPlugin({
      id: "example.feature",
      contributions: [
        {
          kind: "toolbar-control",
          id: "example.control",
          label: "Insert",
          behavior,
          feature: "example",
          order: 10
        }
      ]
    });

    const disabled = createClassicEditorRegistry({
      plugins: [plugin],
      features: resolveClassicEditorFeatures({ example: false })
    });
    const enabled = createClassicEditorRegistry({
      plugins: [plugin],
      features: resolveClassicEditorFeatures({ example: false }, { example: true })
    });

    expect(disabled.contributions).toHaveLength(0);
    expect(enabled.contributions.map((item) => item.id)).toEqual(["example.control"]);
    expect(enabled.contributions[0]).toMatchObject({ behavior });
  });

  it("orders contributions deterministically across independent plugins", () => {
    const behavior = { execute: () => true };
    const registry = createClassicEditorRegistry({
      plugins: [
        defineClassicEditorPlugin({
          id: "example.first",
          contributions: [
            {
              kind: "menu-item",
              id: "example.later",
              menuId: "example",
              menuLabel: "Example",
              label: "Later",
              behavior,
              order: 20
            }
          ]
        }),
        defineClassicEditorPlugin({
          id: "example.second",
          contributions: [
            {
              kind: "menu-item",
              id: "example.earlier",
              menuId: "example",
              menuLabel: "Example",
              label: "Earlier",
              behavior,
              order: 10
            }
          ]
        })
      ],
      features: {}
    });

    expect(registry.contributions.map((item) => item.id)).toEqual([
      "example.earlier",
      "example.later"
    ]);
  });

  it("rejects duplicate ids and dangling document-service references", () => {
    const duplicate = defineClassicEditorPlugin({ id: "example.duplicate" });
    expect(() => createClassicEditorRegistry({
      plugins: [duplicate, duplicate],
      features: {}
    })).toThrow(/Duplicate Classic Editor plugin id/u);

    const danglingService = defineClassicEditorPlugin({
      id: "example.dangling-service",
      contributions: [{
        kind: "document-service",
        id: "example.dangling-service-menu",
        menuId: "import",
        menuLabel: "Import",
        label: "Unavailable format",
        service: "example.missing-service",
        operation: "import"
      }]
    });
    expect(() => createClassicEditorRegistry({
      plugins: [danglingService],
      features: {}
    })).toThrow(/Unknown Classic Editor document service reference/u);
  });

  it("collects direct ribbon actions and validates their owning group", () => {
    const action = {
      id: "example.format.bold",
      label: "Bold",
      order: 10,
      run: () => true
    };
    const valid = defineClassicEditorPlugin({
      id: "example.ribbon-action",
      contributions: [
        {
          kind: "ribbon-tab",
          id: "example.home",
          label: "Home"
        },
        {
          kind: "ribbon-group",
          id: "example.format",
          tabId: "example.home",
          label: "Format"
        },
        {
          kind: "ribbon-action-control",
          id: "example.bold",
          groupId: "example.format",
          label: "Bold",
          action,
          order: 10
        }
      ]
    });

    expect(createClassicEditorRegistry({ plugins: [valid], features: {} })
      .contributions.map((item) => item.id))
      .toEqual(["example.home", "example.format", "example.bold"]);

    const dangling = defineClassicEditorPlugin({
      id: "example.dangling-ribbon-action",
      contributions: [{
        kind: "ribbon-action-control",
        id: "example.orphan",
        groupId: "example.missing",
        label: "Orphan",
        action,
        order: 10
      }]
    });
    expect(() => createClassicEditorRegistry({ plugins: [dangling], features: {} }))
      .toThrow(/Unknown Classic Editor ribbon group reference/u);
  });

  it("collects direct-behavior surface hooks from an ordinary extension", () => {
    const execute = vi.fn(() => true);
    const behavior = { execute };
    const extension = Extension.create({
      name: "example.extension-ui",
      addToolbarItems() {
        return [{
          kind: "toolbar-control",
          id: "example.toolbar.inspect",
          label: "Inspect",
          behavior
        }];
      },
      addContextMenuItems() {
        return [{
          kind: "context-menu-item",
          id: "example.context.inspect",
          label: "Inspect here",
          behavior
        }];
      },
      addSelectionPopupItems() {
        return [{
          kind: "selection-popup-item",
          id: "example.selection.inspect",
          label: "Inspect selection",
          behavior
        }];
      },
      addContextualPopupItems() {
        return [{
          kind: "contextual-popup-item",
          id: "example.contextual.inspect",
          target: "example-node",
          icon: "extension",
          label: "Inspect node",
          behavior,
          payload: (trigger) => ({ position: trigger.position })
        }];
      },
      addWorkspaceWidgets() {
        return [{
          kind: "workspace-widget",
          id: "example.workspace.inspector",
          mount: () => ({
            element: null,
            destroy: () => undefined
          })
        }];
      },
      addSidebarPanels() {
        return [{
          kind: "sidebar-panel",
          id: "example.inspector",
          side: "right",
          label: "Inspector",
          render: () => "Inspector"
        }];
      },
      addGlobalSettingsSections() {
        return [{
          kind: "global-settings-section",
          id: "example.settings.typography",
          label: "Typography",
          component: defineComponent({ template: "<div />" })
        }];
      }
    });

    const registry = createClassicEditorRegistry({
      plugins: [],
      extensions: [extension],
      features: {},
      ui: {
        toolbar: { items: ["example.toolbar.inspect"] },
        contextMenu: false,
        selectionPopup: { items: ["example.selection.inspect"] }
      }
    });

    expect(registry.contributions.map((item) => item.id)).toEqual([
      "example.workspace.inspector",
      "example.contextual.inspect",
      "example.inspector",
      "example.settings.typography",
      "example.toolbar.inspect",
      "example.selection.inspect"
    ]);
    expect(
      registry.contributions.find(
        (item) => item.kind === "contextual-popup-item"
      )
    ).toMatchObject({
      target: "example-node",
      icon: "extension",
      behavior
    });
  });

  it("collects a direct context-menu action without a Behavior adapter", () => {
    const action = {
      id: "example.context.direct",
      label: "Direct action",
      order: 10,
      run: vi.fn(() => true)
    };
    const extension = Extension.create({
      name: "example.direct-context-action",
      addContextMenuItems() {
        return [{
          kind: "context-menu-item",
          id: "example.context.direct",
          label: "Direct action",
          submenu: "Example",
          action
        }];
      }
    });
    const registry = createClassicEditorRegistry({
      plugins: [],
      extensions: [extension],
      features: {},
      ui: { contextMenu: { items: ["example.context.direct"] } }
    });
    const contribution = registry.contributions[0];

    expect(contribution).toMatchObject({
      kind: "context-menu-item",
      id: "example.context.direct",
      submenu: "Example",
      action
    });
    expect(contribution).not.toHaveProperty("behavior");
  });

  it("collects ribbon, ruler, and semantic popmenu hooks from every extension kind", () => {
    const behavior = { execute: () => true };
    const owners = [
      Extension.create({
        name: "example.extension-surfaces",
        addRibbonGroups() {
          return [{
            kind: "ribbon-group",
            id: "example.extension.group",
            tabId: "example.tab",
            label: "Extension"
          }];
        },
        addRibbonItems() {
          return [{
            kind: "ribbon-control",
            id: "example.extension.control",
            groupId: "example.extension.group",
            label: "Extension",
            behavior
          }];
        },
        addRibbonWidgets() {
          return [{
            kind: "ribbon-widget",
            id: "example.extension.widget",
            groupId: "example.extension.group",
            mount: () => ({
              element: null,
              update: () => undefined,
              destroy: () => undefined
            })
          }];
        },
        addRulers() {
          return [{
            kind: "ruler",
            id: "example.extension.ruler",
            mount: () => ({ destroy: () => undefined })
          }];
        },
        addPopmenus() {
          return [{
            kind: "popmenu",
            id: "example.extension.popmenu",
            eventType: "example-extension-popmenu",
            items: () => []
          }];
        }
      }),
      Node.create({
        name: "exampleNodeSurfaces",
        addRibbonGroups() {
          return [{
            kind: "ribbon-group",
            id: "example.node.group",
            tabId: "example.tab",
            label: "Node"
          }];
        },
        addRibbonItems() {
          return [{
            kind: "ribbon-control",
            id: "example.node.control",
            groupId: "example.node.group",
            label: "Node",
            behavior
          }];
        },
        addRibbonWidgets() {
          return [{
            kind: "ribbon-widget",
            id: "example.node.widget",
            groupId: "example.node.group",
            mount: () => ({
              element: null,
              update: () => undefined,
              destroy: () => undefined
            })
          }];
        },
        addRulers() {
          return [{
            kind: "ruler",
            id: "example.node.ruler",
            mount: () => ({ destroy: () => undefined })
          }];
        },
        addPopmenus() {
          return [{
            kind: "popmenu",
            id: "example.node.popmenu",
            eventType: "example-node-popmenu",
            items: () => []
          }];
        }
      }),
      Mark.create({
        name: "exampleMarkSurfaces",
        addRibbonGroups() {
          return [{
            kind: "ribbon-group",
            id: "example.mark.group",
            tabId: "example.tab",
            label: "Mark"
          }];
        },
        addRibbonItems() {
          return [{
            kind: "ribbon-control",
            id: "example.mark.control",
            groupId: "example.mark.group",
            label: "Mark",
            behavior
          }];
        },
        addRibbonWidgets() {
          return [{
            kind: "ribbon-widget",
            id: "example.mark.widget",
            groupId: "example.mark.group",
            mount: () => ({
              element: null,
              update: () => undefined,
              destroy: () => undefined
            })
          }];
        },
        addRulers() {
          return [{
            kind: "ruler",
            id: "example.mark.ruler",
            mount: () => ({ destroy: () => undefined })
          }];
        },
        addPopmenus() {
          return [{
            kind: "popmenu",
            id: "example.mark.popmenu",
            eventType: "example-mark-popmenu",
            items: () => []
          }];
        }
      })
    ];
    const registry = createClassicEditorRegistry({
      plugins: [defineClassicEditorPlugin({
        id: "example.ribbon-shell",
        contributions: [{
          kind: "ribbon-tab",
          id: "example.tab",
          label: "Example"
        }]
      })],
      extensions: owners,
      features: {}
    });

    expect(registry.contributions.map((item) => item.id)).toEqual([
      "example.tab",
      "example.extension.group",
      "example.node.group",
      "example.mark.group",
      "example.extension.control",
      "example.node.control",
      "example.mark.control",
      "example.extension.widget",
      "example.node.widget",
      "example.mark.widget",
      "example.extension.ruler",
      "example.node.ruler",
      "example.mark.ruler",
      "example.extension.popmenu",
      "example.node.popmenu",
      "example.mark.popmenu"
    ]);
  });

  it("validates ids and structural references from extension-owned product surfaces", () => {
    const duplicateRuler = Extension.create({
      name: "example.duplicate-ruler",
      addRulers() {
        return [{
          kind: "ruler",
          id: "example.duplicate",
          mount: () => ({ destroy: () => undefined })
        }];
      }
    });
    expect(() => createClassicEditorRegistry({
      plugins: [defineClassicEditorPlugin({
        id: "example.duplicate-plugin",
        contributions: [{
          kind: "ruler",
          id: "example.duplicate",
          mount: () => ({ destroy: () => undefined })
        }]
      })],
      extensions: [duplicateRuler],
      features: {}
    })).toThrow(/Duplicate Classic Editor contribution id/u);

    const danglingRibbonWidget = Extension.create({
      name: "example.dangling-ribbon-widget",
      addRibbonWidgets() {
        return [{
          kind: "ribbon-widget",
          id: "example.dangling-widget",
          groupId: "example.missing-group",
          mount: () => ({
            element: null,
            update: () => undefined,
            destroy: () => undefined
          })
        }];
      }
    });
    expect(() => createClassicEditorRegistry({
      plugins: [],
      extensions: [danglingRibbonWidget],
      features: {}
    })).toThrow(/Unknown Classic Editor ribbon group reference/u);
  });

  it("uses top-level profiles as ordered surface allowlists", () => {
    const first = { execute: () => true };
    const second = { execute: () => true };
    const direct = {
      id: "direct.action",
      label: "Direct",
      order: 1,
      run: () => true
    };
    const registry = createClassicEditorRegistry({
      plugins: [defineClassicEditorPlugin({
        id: "example.toolbar",
        toolbarItems: [
          { kind: "toolbar-control", id: "first", label: "First", behavior: first },
          { kind: "toolbar-control", id: "second", label: "Second", behavior: second },
          {
            kind: "toolbar-action-control",
            id: "direct",
            label: "Direct",
            action: direct
          }
        ]
      })],
      features: {},
      ui: { toolbar: { items: ["direct", "second", "first"] } }
    });

    expect(registry.contributions.map((item) => item.id))
      .toEqual(["direct", "second", "first"]);
  });

  it("defaults to user declarations and adds developer declarations explicitly", () => {
    const behavior = { execute: () => true };
    const userPlugin = defineClassicEditorPlugin({
      id: "example.user",
      contributions: [
        {
          kind: "status-item",
          id: "example.user.status",
          render: () => "User"
        },
        {
          kind: "status-item",
          id: "example.developer.status",
          audience: "developer",
          render: () => "Developer"
        }
      ],
      keyboardShortcuts: [{ shortcut: "mod-u", behavior }]
    });
    const developerPlugin = defineClassicEditorPlugin({
      id: "example.developer",
      audience: "developer",
      contributions: [{
        kind: "status-item",
        id: "example.inherited-developer.status",
        audience: "user",
        render: () => "Inherited developer"
      }],
      keyboardShortcuts: [{ shortcut: "mod-d", behavior }],
      services: [{
        id: "example.developer.service",
        label: "Developer service",
        format: {
          id: "developer",
          extensions: [".dev"],
          mimeTypes: ["application/x-developer"]
        },
        export: () => ({
          data: "developer",
          fileName: "developer.dev",
          mimeType: "application/x-developer"
        })
      }]
    });

    const user = createClassicEditorRegistry({
      plugins: [userPlugin, developerPlugin],
      features: {}
    });
    const developer = createClassicEditorRegistry({
      plugins: [userPlugin, developerPlugin],
      features: {},
      surfaceMode: "developer"
    });

    expect(user.surfaceMode).toBe("user");
    expect(user.plugins.map(({ id }) => id)).toEqual(["example.user"]);
    expect(user.contributions.map(({ id }) => id)).toEqual(["example.user.status"]);
    expect(user.keyboardShortcuts.map(({ shortcut }) => shortcut)).toEqual(["mod-u"]);
    expect([...user.services.keys()]).toEqual([]);
    expect(developer.plugins.map(({ id }) => id)).toEqual([
      "example.user",
      "example.developer"
    ]);
    expect(developer.contributions.map(({ id }) => id)).toEqual([
      "example.user.status",
      "example.developer.status",
      "example.inherited-developer.status"
    ]);
    expect(developer.keyboardShortcuts.map(({ shortcut }) => shortcut)).toEqual([
      "mod-u",
      "mod-d"
    ]);
    expect([...developer.services.keys()]).toEqual(["example.developer.service"]);
  });

  it("validates hidden declarations before audience and feature projection", () => {
    const behavior = { execute: () => true };
    const duplicateShortcut = [
      defineClassicEditorPlugin({
        id: "example.shortcut.user",
        keyboardShortcuts: [{ shortcut: "mod-shift-x", behavior }]
      }),
      defineClassicEditorPlugin({
        id: "example.shortcut.developer",
        audience: "developer",
        keyboardShortcuts: [{
          shortcut: "MOD-SHIFT-X",
          behavior,
          feature: "disabled"
        }]
      })
    ];
    expect(() => createClassicEditorRegistry({
      plugins: duplicateShortcut,
      features: { disabled: false }
    })).toThrow(/Duplicate Classic Editor keyboard shortcut id/u);

    const hiddenDanglingService = defineClassicEditorPlugin({
      id: "example.hidden-dangling",
      audience: "developer",
      contributions: [{
        kind: "document-service",
        id: "example.hidden-dangling.menu",
        menuId: "export",
        menuLabel: "Export",
        label: "Unavailable",
        service: "example.missing",
        operation: "export"
      }]
    });
    expect(() => createClassicEditorRegistry({
      plugins: [hiddenDanglingService],
      features: {}
    })).toThrow(/Unknown Classic Editor document service reference/u);

    const invalidAudience = defineClassicEditorPlugin({
      id: "example.invalid-audience",
      audience: "diagnostic" as "developer"
    });
    expect(() => createClassicEditorRegistry({
      plugins: [invalidAudience],
      features: {}
    })).toThrow(/Unknown Classic Editor audience/u);
  });

  it("rejects an invalid surface mode before creating a registry snapshot", () => {
    expect(() => createClassicEditorRegistry({
      plugins: [],
      features: {},
      surfaceMode: "diagnostic" as "developer"
    })).toThrow(/Unknown Classic Editor surface mode/u);
  });
});

describe("Classic plugin editor extensions", () => {
  it("installs extensions of plugins visible on the surface in installation order", () => {
    const first = Extension.create({ name: "first" });
    const second = Extension.create({ name: "second" });
    const developerOnly = Extension.create({ name: "developerOnly" });
    const plugins = [
      { id: "fixture.first", extensions: [first] },
      { id: "fixture.developer", audience: "developer" as const, extensions: [developerOnly] },
      { id: "fixture.none" },
      { id: "fixture.second", extensions: [second] }
    ];

    expect(collectClassicEditorPluginExtensions(plugins, "user")).toEqual([first, second]);
    expect(collectClassicEditorPluginExtensions(plugins, "developer")).toEqual([first, developerOnly, second]);
  });
});
