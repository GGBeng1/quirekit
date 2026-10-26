const hindiNumbers = [
  "एक", "दो", "तीन", "चार", "पांच", "छह", "सात", "आठ", "नौ", "दस",
  "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह",
  "उन्नीस", "बीस", "इकीस", "बाईस", "तेइस", "चौबीस", "पच्चीस", "छब्बीस",
  "सताइस", "अट्ठाइस", "उनतीस", "तीस", "इकतीस", "बतीस", "तैंतीस",
  "चौंतीस", "पैंतीस", "छतीस", "सैंतीस", "अड़तीस", "उनतालीस", "चालीस",
  "इकतालीस", "बयालीस", "तैतालीस", "चवालीस", "पैंतालीस", "छयालिस",
  "सैंतालीस", "अड़तालीस", "उनचास", "पचास", "इक्यावन", "बावन", "तिरपन",
  "चौवन", "पचपन", "छप्पन", "सतावन", "अठावन", "उनसठ", "साठ", "इकसठ",
  "बासठ", "तिरसठ", "चौंसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ",
  "उनहतर", "सत्तर", "इकहतर", "बहतर", "तिहतर", "चौहतर", "पचहतर",
  "छिहतर", "सतहतर", "अठहतर", "उन्नासी", "अस्सी", "इक्यासी", "बयासी",
  "तिरासी", "चौरासी", "पचासी", "छियासी", "सतासी", "अट्ठासी", "नवासी",
  "नब्बे", "इक्यानवे", "बानवे", "तिरानवे", "चौरानवे", "पचानवे",
  "छियानवे", "सतानवे", "अट्ठानवे", "निन्यानवे"
] as const;
const thaiNumbers = [
  "หนึ่ง",
  "สอง",
  "สาม",
  "สี่",
  "ห้า",
  "หก",
  "เจ็ด",
  "แปด",
  "เก้า",
  "สิบ"
] as const;
const vietnameseNumbers = [
  "một",
  "hai",
  "ba",
  "bốn",
  "năm",
  "sáu",
  "bảy",
  "tám",
  "chín",
  "mười"
] as const;

/**
 * Formats a Hindi counting word with the 9,999-value cycle.
 *
 * @param value - Positive counter.
 * @returns Hindi counting words.
 */
export function formatHindiCounting(value: number): string {
  let normalized = ((value - 1) % 9_999) + 1;
  const groups: string[] = [];
  const thousands = Math.floor(normalized / 1_000);
  normalized %= 1_000;
  const hundreds = Math.floor(normalized / 100);
  const remainder = normalized % 100;
  if (thousands > 0) {
    groups.push(hindiNumbers[(thousands - 1) % 99] ?? String(thousands), "हज़ार");
  }
  if (hundreds > 0) {
    groups.push(hindiNumbers[(hundreds - 1) % 99] ?? String(hundreds), "सौ");
  }
  if (remainder > 0) {
    groups.push(hindiNumbers[(remainder - 1) % 99] ?? String(remainder));
  }
  return groups.join(" ");
}

/**
 * Formats Thai counting words below one billion.
 *
 * @param value - Positive counter.
 * @returns Thai counting words, or the mature zero word above the range.
 */
export function formatThaiCounting(value: number): string {
  if (value >= 1_000_000_000) return "ศูนย์";
  return formatThaiGroup(value);
}

/**
 * Formats Vietnamese counting words with the 1,000-value cycle.
 *
 * @param value - Positive counter.
 * @returns Vietnamese counting words.
 */
export function formatVietnameseCounting(value: number): string {
  let normalized = ((value - 1) % 1_000) + 1;
  const groups: string[] = [];
  const hundreds = Math.floor(normalized / 100);
  normalized %= 100;
  if (hundreds > 0) {
    groups.push(vietnameseNumbers[hundreds - 1] ?? String(hundreds), "trăm");
    if (normalized > 0 && normalized < 10) groups.push("lẻ");
  }
  groups.push(...formatVietnameseBelowHundred(normalized));
  return groups.join(" ");
}

/**
 * Formats one Thai positive value below one billion.
 *
 * @param value - Positive counter below one billion.
 * @returns Thai word sequence.
 */
function formatThaiGroup(value: number): string {
  const groups: string[] = [];
  const degrees = [
    [1_000_000, "ล้าน"],
    [100_000, "แสน"],
    [10_000, "หมื่น"],
    [1_000, "พัน"],
    [100, "ร้อย"]
  ] as const;
  let remaining = value;
  for (const [degree, word] of degrees) {
    const count = Math.floor(remaining / degree);
    remaining %= degree;
    if (count === 0) continue;
    groups.push(
      ...(degree === 1_000_000 && count >= 100
        ? [formatThaiGroup(count)]
        : formatThaiBelowHundred(count, false)),
      word
    );
  }
  groups.push(...formatThaiBelowHundred(remaining, value >= 100));
  return groups.join("");
}

/**
 * Formats a Thai value below one hundred.
 *
 * @param value - Value below one hundred.
 * @param followsHigherDegree - Whether the value follows a higher degree.
 * @returns Thai word tokens.
 */
function formatThaiBelowHundred(
  value: number,
  followsHigherDegree: boolean
): string[] {
  if (value <= 0) return [];
  if (value <= 10) {
    return [value === 1 && followsHigherDegree
      ? "เอ็ด"
      : thaiNumbers[value - 1] ?? String(value)];
  }
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  const result: string[] = [];
  if (tens !== 1) result.push(tens === 2 ? "ยี่" : thaiNumbers[tens - 1] ?? "");
  result.push("สิบ");
  if (ones > 0) result.push(ones === 1 ? "เอ็ด" : thaiNumbers[ones - 1] ?? "");
  return result;
}

/**
 * Formats a Vietnamese value below one hundred.
 *
 * @param value - Value below one hundred.
 * @returns Vietnamese word tokens.
 */
function formatVietnameseBelowHundred(value: number): string[] {
  if (value <= 0) return [];
  if (value <= 10) return [vietnameseNumbers[value - 1] ?? String(value)];
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return [
    ...(tens === 1 ? [] : [vietnameseNumbers[tens - 1] ?? String(tens)]),
    "mười",
    ...(ones === 0 ? [] : [vietnameseNumbers[ones - 1] ?? String(ones)])
  ];
}
