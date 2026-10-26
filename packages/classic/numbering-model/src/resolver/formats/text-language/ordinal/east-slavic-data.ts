/**
 * Lexical transformations used by the mature exact-thousand ordinal program.
 */
export type CompoundThousandOrdinalLexicon = {
  /** Cardinal component to ordinary ordinal word. */
  readonly numbers: Readonly<Record<string, string>>;
  /** Cardinal component to compound thousand prefix. */
  readonly thousandUnits: Readonly<Record<string, string>>;
  /** Cardinal hundred component to compound thousand prefix. */
  readonly thousandHundreds: Readonly<Record<string, string>>;
  /** Optional tens rewritten even outside exact-thousand compounds. */
  readonly tens?: Readonly<Record<string, string>>;
  /** Substring identifying a cardinal thousand noun. */
  readonly thousandEntry: string;
  /** Ordinal thousand suffix. */
  readonly thousandOrdinal: string;
};

const russianNumbers: Readonly<Record<string, string>> = {
  один: "первый",
  два: "второй",
  три: "третий",
  четыре: "четвертый",
  пять: "пятый",
  шесть: "шестой",
  семь: "седьмой",
  восемь: "восьмой",
  девять: "девятый",
  десять: "десятый",
  одиннадцать: "одиннадцатый",
  двенадцать: "двенадцатый",
  тринадцать: "тринадцатый",
  четырнадцать: "четырнадцатый",
  пятнадцать: "пятнадцатый",
  шестнадцать: "шестнадцатый",
  семнадцать: "семнадцатый",
  восемнадцать: "восемнадцатый",
  девятнадцать: "девятнадцатый",
  двадцать: "двадцатый",
  тридцать: "тридцатый",
  сорок: "сороковой",
  пятьдесят: "пятидесятый",
  шестьдесят: "шестидесятый",
  семьдесят: "семидесятый",
  восемьдесят: "восьмидесятый",
  девяносто: "девяностый",
  сто: "сотый",
  двести: "двухсотый",
  триста: "трехсотый",
  четыреста: "четырехсотый",
  пятьсот: "пятисотый",
  шестьсот: "шестисотый",
  семьсот: "семисотый",
  восемьсот: "восьмисотый",
  девятьсот: "девятисотый"
};
const russianThousandUnits: Readonly<Record<string, string>> = {
  одна: "",
  две: "двух",
  три: "трех",
  четыре: "четырех",
  пять: "пяти",
  шесть: "шести",
  семь: "семи",
  восемь: "восьми",
  девять: "девяти",
  десять: "десяти",
  одиннадцать: "одиннадцати",
  двенадцать: "двенадцати",
  тринадцать: "тринадцати",
  четырнадцать: "четырнадцати",
  пятнадцать: "пятнадцати",
  шестнадцать: "шестнадцати",
  семнадцать: "семнадцати",
  восемнадцать: "восемнадцати",
  девятнадцать: "девятнадцати",
  двадцать: "двадцати",
  тридцать: "тридцати",
  сорок: "сорока",
  пятьдесят: "пятидесяти",
  шестьдесят: "шестидесяти",
  семьдесят: "семидесяти",
  восемьдесят: "восьмидесяти",
  девяносто: "девяносто"
};

const ukrainianNumbers: Readonly<Record<string, string>> = {
  один: "перший",
  два: "другий",
  три: "третій",
  чотири: "четвертий",
  "п'ять": "п'ятий",
  шість: "шостий",
  сім: "сьомий",
  вісім: "восьмий",
  "дев'ять": "дев'ятий",
  десять: "десятий",
  одинадцять: "одинадцятий",
  дванадцять: "дванадцятий",
  тринадцять: "тринадцятий",
  чотирнадцять: "чотирнадцятий",
  "п'ятнадцять": "п'ятнадцятий",
  шістнадцять: "шістнадцятий",
  сімнадцять: "сімнадцятий",
  вісімнадцять: "вісімнадцятий",
  "дев'ятнадцять": "дев'ятнадцятий",
  двадцять: "двадцятий",
  тридцять: "тридцятий",
  сорок: "сороковий",
  "п'ятдесят": "п'ятдесятий",
  шiстдесят: "шiстдесятий",
  сімдесят: "сімдесятий",
  вісімдесят: "вісімдесятий",
  "дев'яносто": "дев'яностий",
  сто: "сотий",
  двісті: "двохсотий",
  триста: "трьохсотий",
  чотириста: "чотирьохсотий",
  "п'ятсот": "п'ятисотий",
  шістсот: "шестисотий",
  сімсот: "семисотий",
  вісімсот: "восьмисотий",
  "дев'ятсот": "дев'ятисотий"
};
const ukrainianThousandUnits: Readonly<Record<string, string>> = {
  одна: "одно",
  дві: "двох",
  три: "трьох",
  чотири: "чотирьох",
  "п'ять": "п'яти",
  шість: "шести",
  сім: "семи",
  вісім: "восьми",
  "дев'ять": "дев'яти",
  десять: "десяти",
  одинадцять: "одинадцяти",
  дванадцять: "дванадцяти",
  тринадцять: "тринадцяти",
  чотирнадцять: "чотирнадцяти",
  "п'ятнадцять": "п'ятнадцяти",
  шістнадцять: "шістнадцяти",
  сімнадцять: "сімнадцяти",
  вісімнадцять: "вісімнадцяти",
  "дев'ятнадцять": "дев'ятнадцяти",
  двадцять: "двадцяти",
  тридцять: "тридцяти",
  сорок: "сорока",
  "п'ятдесят": "п'ятдесяти",
  шiстдесят: "шiстдесяти",
  сімдесят: "сімдесяти",
  вісімдесят: "вісімдесяти",
  "дев'яносто": "дев'яносто"
};
const polishNumbers: Readonly<Record<string, string>> = {
  jeden: "pierwszy",
  dwa: "drugi",
  trzy: "trzeci",
  cztery: "czwarty",
  pięć: "piąty",
  sześć: "szósty",
  siedem: "siódmy",
  osiem: "ósmy",
  dziewięć: "dziewiąty",
  dziesięć: "dziesiąty",
  jedenaście: "jedenasty",
  dwanaście: "dwunasty",
  trzynaście: "trzynasty",
  czternaście: "czternasty",
  piętnaście: "piętnasty",
  szesnaście: "szesnasty",
  siedemnaście: "siedemnasty",
  osiemnaście: "osiemnasty",
  dziewiętnaście: "dziewiętnasty",
  dwadzieścia: "dwudziesty",
  trzydzieści: "trzydziesty",
  czterdzieści: "czterdziesty",
  pięćdziesiąt: "pięćdziesiąty",
  sześćdziesiąt: "sześćdziesiąty",
  siedemdziesiąt: "siedemdziesiąty",
  osiemdziesiąt: "osiemdziesiąty",
  dziewięćdziesiąt: "dziewięćdziesiąty",
  sto: "setny",
  dwieście: "dwusetny",
  trzysta: "trzysetny",
  czterysta: "czterysetny",
  pięćset: "pięćsetny",
  sześćset: "sześćsetny",
  siedemset: "siedemsetny",
  osiemset: "osiemsetny",
  dziewięćset: "dziewięćsetny"
};
const polishThousandUnits: Readonly<Record<string, string>> = {
  jeden: "jedno",
  dwa: "dwu",
  trzy: "trzy",
  cztery: "cztero",
  pięć: "piącio",
  sześć: "szeącio",
  siedem: "siedmio",
  osiem: "óąmio",
  dziewięć: "dziewiącio",
  dziesięć: "dziesiącio",
  jedenaście: "jedenasto",
  dwanaście: "dwunasto",
  trzynaście: "trzynasto",
  czternaście: "czternasto",
  piętnaście: "piętnasto",
  szesnaście: "szesnasto",
  siedemnaście: "siedemnasto",
  osiemnaście: "osiemnastotysięczny",
  dziewiętnaście: "dziewiętnastotysięczny",
  dwadzieścia: "dwudziestotysięczny",
  trzydzieści: "trzydziestotysięczny",
  czterdzieści: "czterdziesto",
  pięćdziesiąt: "pięćdziesiącio",
  sześćdziesiąt: "sześćdziesiącio",
  siedemdziesiąt: "siedemdziesiącio",
  osiemdziesiąt: "osiemdziesiącio",
  dziewięćdziesiąt: "dziewięćdziesiącio"
};

/** Russian compound-thousand ordinal lexicon. */
export const russianOrdinalLexicon: CompoundThousandOrdinalLexicon = {
  numbers: russianNumbers,
  thousandUnits: russianThousandUnits,
  thousandHundreds: {
    сто: "сто",
    двести: "двухсот",
    триста: "трехсот",
    четыреста: "четырехсот",
    пятьсот: "пятьсот",
    шестьсот: "шестьсот",
    семьсот: "семьсот",
    восемьсот: "восемьсот",
    девятьсот: "девятьсот"
  },
  thousandEntry: "тысяч",
  thousandOrdinal: "тысячный"
};

/** Ukrainian compound-thousand ordinal lexicon. */
export const ukrainianOrdinalLexicon: CompoundThousandOrdinalLexicon = {
  numbers: ukrainianNumbers,
  thousandUnits: ukrainianThousandUnits,
  thousandHundreds: {
    сто: "сто",
    двісті: "двохсот",
    триста: "трьохсот",
    чотириста: "чотирьохсот",
    "п'ятсот": "п'ятисот",
    шістсот: "шестисот",
    сімсот: "семисот",
    вісімсот: "восьмисот",
    "дев'ятьсот": "дев'ятисот"
  },
  thousandEntry: "тисяч",
  thousandOrdinal: "тисячний"
};

/** Polish compound-thousand ordinal lexicon. */
export const polishOrdinalLexicon: CompoundThousandOrdinalLexicon = {
  numbers: polishNumbers,
  thousandUnits: polishThousandUnits,
  thousandHundreds: {
    sto: "stu",
    dwieście: "dwustu",
    trzysta: "trzystu",
    czterysta: "czterystu",
    pięćset: "pięćset",
    sześćset: "szeuśćset",
    siedemset: "siedemset",
    osiemset: "osiemset",
    dziewięćset: "dziewięćset"
  },
  tens: {
    dwadzieścia: "dwudziesty",
    trzydzieści: "trzydziesty",
    czterdzieści: "czterdziesty",
    pięćdziesiąt: "pięćdziesiąty",
    sześćdziesiąt: "sześćdziesiąty",
    siedemdziesiąt: "siedemdziesiąty",
    osiemdziesiąt: "osiemdziesiąty",
    dziewięćdziesiąt: "dziewięćdziesiąty"
  },
  thousandEntry: "tysi",
  thousandOrdinal: "tysięczny"
};
