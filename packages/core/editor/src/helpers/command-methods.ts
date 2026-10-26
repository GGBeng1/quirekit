import type { AnyCommands, CommandSpec } from "../types";

const isEnumerable = Object.prototype.propertyIsEnumerable;

/**
 * Creates a command table whose methods bind on first use.
 *
 * Product UIs create a `can()`/`commands`/`chain()` surface for every check, while
 * each check calls one or two commands. Binding lazily keeps that O(1) instead of
 * creating one closure per registered command. The table still behaves as an
 * ordinary object: own keys follow the registry order, descriptors are writable,
 * enumerable and configurable, and a bound method keeps its identity.
 *
 * @param rawCommands - Current extension command factories; the registry object is never mutated.
 * @param bind - Creates one method that captures a factory and execution context.
 * @returns Object with enumerable, writable own command methods.
 */
export function createQuireCommandMethods<Method>(
  rawCommands: AnyCommands,
  bind: (command: CommandSpec) => Method
): Record<string, Method> {
  const methods: Record<string, Method> = {};
  const removed = new Set<string>();

  /**
   * Binds one registered command into the backing table when first observed.
   *
   * @param name - Property key being read or described.
   * @returns Whether the key names a registered command.
   */
  const materialize = (name: string | symbol): boolean => {
    if (typeof name !== "string" || !isEnumerable.call(rawCommands, name) || removed.has(name)) return false;
    if (!Object.hasOwn(methods, name)) {
      // A frozen table already materialized every key it reported.
      if (!Object.isExtensible(methods)) return false;
      Object.defineProperty(methods, name, {
        value: bind(rawCommands[name]!),
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    return true;
  };

  return new Proxy(methods, {
    get: (target, name, receiver) => {
      if (!Object.hasOwn(target, name)) materialize(name);
      return Reflect.get(target, name, receiver);
    },
    has: (target, name) => Reflect.has(target, name) || materialize(name),
    deleteProperty: (target, name) => {
      if (typeof name === "string") removed.add(name);
      return Reflect.deleteProperty(target, name);
    },
    getOwnPropertyDescriptor: (target, name) => {
      if (!Object.hasOwn(target, name)) materialize(name);
      return Reflect.getOwnPropertyDescriptor(target, name);
    },
    ownKeys: (target) => {
      const names = Object.keys(rawCommands).filter((name) => materialize(name));
      // Registry order first, then properties a caller added (such as `run`).
      const registered = new Set<string | symbol>(names);
      return [...names, ...Reflect.ownKeys(target).filter((key) => !registered.has(key))];
    }
  });
}
