import type { InflectedThousandsLexicon } from "../types";

const cs: InflectedThousandsLexicon = {
  units: [
    "jedna", "dva", "tři", "čtyři", "pět", "šest", "sedm", "osm",
    "devět", "deset", "jedenáct", "dvanáct", "třináct", "čtrnáct",
    "patnáct", "šestnáct", "sedmnáct", "osmnáct", "devatenáct"
  ],
  tens: [
    "dvacet", "třicet", "čtyřicet", "padesát", "šedesát",
    "sedmdesát", "osmdesát", "devadesát"
  ],
  hundreds: [
    "sto", "dvě stě", "tři sta", "čtyři sta", "pět set", "šest set",
    "sedm set", "osm set", "devět set"
  ],
  thousands: ["tisíc", "tisíce", "tisíc"],
  thousandUnits: ["jedna", "dva"],
  omitSingleOne: true
};

const el: InflectedThousandsLexicon = {
  units: [
    "ένα", "δύο", "τρία", "τέσσερα", "πέντε", "έξι", "επτά", "οκτώ",
    "εννέά", "δέκα", "ένδεκα", "δώδεκα", "δεκατρία", "δεκατέσσερα",
    "δεκαπέντε", "δεκαέξι", "δεκαεπτά", "δεκαοκτώ", "δεκαεννέά"
  ],
  tens: [
    "είκοσι", "τριάντα", "σαράντα", "πενήντα", "εξήντα",
    "εβδομήντα", "ογδόντα", "ενενήντα"
  ],
  hundreds: [
    "εκατό", "διακόσια", "τριακόσια", "τετρακόσια", "πεντακόσια",
    "εξακόσια", "επτακόσια", "οκτακόσια", "εννιακόσια"
  ],
  thousands: ["χίλια", "χιλιάδες", "χιλιάδες"],
  thousandUnits: ["ένα", "δύο"],
  omitSingleOne: true,
  thousandFour: "τέσσερις",
  linkedHundred: "εκατόv"
};

const lv: InflectedThousandsLexicon = {
  units: [
    "viens", "divi", "trīs", "četri", "pieci", "seši", "septiņi",
    "astoņi", "deviņi", "desmit", "vienpadsmit", "divpadsmit",
    "trīspadsmit", "četrpadsmit", "piecpadsmit", "sešpadsmit",
    "septiņpadsmit", "astoņpadsmit", "deviņpadsmit"
  ],
  tens: [
    "divdesmit", "trīsdesmit", "četrdesmit", "piecdesmit", "sešdesmit",
    "septiņdesmit", "astoņdesmit", "deviņdesmit"
  ],
  hundreds: [
    "simti", "divi simti", "trīs simti", "četri simti", "pieci simti",
    "seši simti", "septiņi simti", "astoņi simti", "deviņi simti"
  ],
  thousands: ["tūkstotis", "tūkstoši", "tūkstoši"],
  thousandUnits: ["viens", "divi"],
  omitSingleOne: true,
  linkedHundred: "simts"
};

const pl: InflectedThousandsLexicon = {
  units: [
    "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem",
    "osiem", "dziewięć", "dziesięć", "jedenaście", "dwanaście",
    "trzynaście", "czternaście", "piętnaście", "szesnaście",
    "siedemnaście", "osiemnaście", "dziewiętnaście"
  ],
  tens: [
    "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt",
    "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt",
    "dziewięćdziesiąt"
  ],
  hundreds: [
    "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset",
    "siedemset", "osiemset", "dziewięćset"
  ],
  thousands: ["tysiąc", "tysiące", "tysięcy"],
  thousandUnits: ["jeden", "dwa"],
  omitSingleOne: true
};

const ru: InflectedThousandsLexicon = {
  units: [
    "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь",
    "девять", "десять", "одиннадцать", "двенадцать", "тринадцать",
    "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать",
    "восемнадцать", "девятнадцать"
  ],
  tens: [
    "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят",
    "семьдесят", "восемьдесят", "девяносто"
  ],
  hundreds: [
    "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот",
    "семьсот", "восемьсот", "девятьсот"
  ],
  thousands: ["тысяча", "тысячи", "тысяч"],
  thousandUnits: ["одна", "две"],
  omitSingleOne: false
};

const uk: InflectedThousandsLexicon = {
  units: [
    "один", "два", "три", "чотири", "п'ять", "шість", "сім", "вісім",
    "дев'ять", "десять", "одинадцять", "дванадцять", "тринадцять",
    "чотирнадцять", "п'ятнадцять", "шістнадцять", "сімнадцять",
    "вісімнадцять", "дев'ятнадцять"
  ],
  tens: [
    "двадцять", "тридцять", "сорок", "п'ятдесят", "шiстдесят",
    "сімдесят", "вісімдесят", "дев'яносто"
  ],
  hundreds: [
    "сто", "двісті", "триста", "чотириста", "п'ятсот", "шістсот",
    "сімсот", "вісімсот", "дев'ятсот"
  ],
  thousands: ["тисяча", "тисячі", "тисяч"],
  thousandUnits: ["одна", "дві"],
  omitSingleOne: true
};

const srCyrl: InflectedThousandsLexicon = {
  units: [
    "један", "два", "три", "четири", "пет", "шест", "седам", "осам",
    "девет", "десет", "једанаест", "дванаест", "тринаест", "четрнаест",
    "петнаест", "шеснаест", "седамнаест", "осамнаест", "деветнаест"
  ],
  tens: [
    "двадесет", "тридесет", "четрдесет", "педесет", "шездесет",
    "седамдесет", "осамдесет", "деведесет"
  ],
  hundreds: [
    "сто", "двјесто", "тристо", "четиристо", "петсто", "шесто",
    "седамсто", "осамсто", "деветсто"
  ],
  thousands: ["тисућу", "тисуће", "тисућа"],
  thousandUnits: ["један", "двије"],
  omitSingleOne: true
};

const srLatn: InflectedThousandsLexicon = {
  units: [
    "jedan", "dva", "tri", "četiri", "pet", "šest", "sedam", "osam",
    "devet", "deset", "jedanaest", "dvanaest", "trinaest", "četrnaest",
    "petnaest", "šesnaest", "sedamnaest", "osamnaest", "devetnaest"
  ],
  tens: [
    "dvadeset", "trideset", "četrdeset", "pedeset", "šezdeset",
    "sedamdeset", "osamdeset", "devedeset"
  ],
  hundreds: [
    "sto", "dvjesto", "tristo", "četiristo", "petsto", "šesto",
    "sedamsto", "osamsto", "devetsto"
  ],
  thousands: ["tisuću", "tisuće", "tisuća"],
  thousandUnits: ["jedan", "dvije"],
  omitSingleOne: true
};

/** Space-separated cardinal lexicons keyed by effective language. */
export const inflectedThousandsLexicons: Readonly<
  Record<string, InflectedThousandsLexicon>
> = {
  "cs-CZ": cs,
  "el-GR": el,
  "lv-LV": lv,
  "pl-PL": pl,
  "ru-RU": ru,
  "sr-Cyrl-RS": srCyrl,
  "sr-Latn-RS": srLatn,
  "uk-UA": uk
};
