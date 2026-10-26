/** Explicitly admitted symbol commands; unknown names must not become text. */
export const mathSymbolCommands: Readonly<Record<string, string>> = Object.freeze({
  // Greek letters.
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', varkappa: 'ϰ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', varpi: 'ϖ',
  rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ',
  phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω', digamma: 'ϝ',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  // Binary operators.
  times: '×', cdot: '⋅', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆', circ: '∘', bullet: '∙',
  oplus: '⊕', ominus: '⊖', otimes: '⊗', oslash: '⊘', odot: '⊙', cup: '∪', cap: '∩', sqcup: '⊔', sqcap: '⊓',
  uplus: '⊎', vee: '∨', wedge: '∧', land: '∧', lor: '∨', setminus: '∖', smallsetminus: '∖', wr: '≀', diamond: '⋄',
  bigtriangleup: '△', bigtriangledown: '▽', triangleleft: '◃', triangleright: '▹', amalg: '⨿',
  dagger: '†', ddagger: '‡', bmod: 'mod', cdotp: '⋅', ltimes: '⋉', rtimes: '⋊', boxplus: '⊞', boxtimes: '⊠',
  // Relations.
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', lt: '<', gt: '>', leqslant: '⩽', geqslant: '⩾',
  ll: '≪', gg: '≫', equiv: '≡', sim: '∼', simeq: '≃', approx: '≈', approxeq: '≊', cong: '≅', propto: '∝',
  asymp: '≍', doteq: '≐', triangleq: '≜', models: '⊨', vdash: '⊢', dashv: '⊣', mid: '∣', nmid: '∤',
  parallel: '∥', nparallel: '∦', perp: '⊥', prec: '≺', succ: '≻', preceq: '⪯', succeq: '⪰',
  in: '∈', ni: '∋', notin: '∉', subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇',
  subsetneq: '⊊', supsetneq: '⊋', nsubseteq: '⊈', nsupseteq: '⊉', sqsubseteq: '⊑', sqsupseteq: '⊒',
  lesssim: '≲', gtrsim: '≳', nless: '≮', ngtr: '≯', nleq: '≰', ngeq: '≱', nsim: '≁', ncong: '≇',
  smile: '⌣', frown: '⌢', bowtie: '⋈', colon: ':',
  // Arrows.
  to: '→', gets: '←', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔',
  Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', longrightarrow: '⟶', longleftarrow: '⟵',
  longleftrightarrow: '⟷', Longrightarrow: '⟹', Longleftarrow: '⟸', Longleftrightarrow: '⟺',
  implies: '⟹', impliedby: '⟸', iff: '⟺', mapsto: '↦', longmapsto: '⟼',
  uparrow: '↑', downarrow: '↓', updownarrow: '↕', Uparrow: '⇑', Downarrow: '⇓', Updownarrow: '⇕',
  nearrow: '↗', searrow: '↘', swarrow: '↙', nwarrow: '↖', hookrightarrow: '↪', hookleftarrow: '↩',
  rightharpoonup: '⇀', leftharpoonup: '↼', rightleftharpoons: '⇌', leadsto: '⇝',
  // Miscellaneous ordinary symbols.
  infty: '∞', partial: '∂', nabla: '∇', forall: '∀', exists: '∃', nexists: '∄', neg: '¬', lnot: '¬',
  emptyset: '∅', varnothing: '∅', angle: '∠', measuredangle: '∡', triangle: '△', square: '□', Box: '□',
  Diamond: '◇', degree: '°', hbar: 'ℏ', ell: 'ℓ', wp: '℘', Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ', beth: 'ℶ',
  imath: 'ı', jmath: 'ȷ', prime: '′', backslash: '\\', top: '⊤', bot: '⊥', flat: '♭', natural: '♮', sharp: '♯',
  clubsuit: '♣', diamondsuit: '♢', heartsuit: '♡', spadesuit: '♠', surd: '√', therefore: '∴', because: '∵',
  ldots: '…', dots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', lbrace: '{', rbrace: '}',
  langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', vert: '|', Vert: '‖',
  // Escaped characters.
  '{': '{', '}': '}', '|': '‖', '#': '#', $: '$', '%': '%', '&': '&', _: '_',
});
/** `\not` combinations with a precomposed negated glyph. */
export const mathNegatedSymbols: Readonly<Record<string, string>> = Object.freeze({
  '=': '≠', '<': '≮', '>': '≯', '∈': '∉', '∋': '∌', '≤': '≰', '≥': '≱', '⊂': '⊄', '⊃': '⊅', '⊆': '⊈', '⊇': '⊉',
  '≡': '≢', '∼': '≁', '≈': '≉', '≅': '≇', '≃': '≄', '∥': '∦', '∣': '∤', '|': '∤', '∃': '∄', '≺': '⊀', '≻': '⊁',
});
