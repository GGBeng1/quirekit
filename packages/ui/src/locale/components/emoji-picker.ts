/** Default emoji group identities shipped with the catalog. */
export type QuireKitEmojiDefaultGroup = "faces" | "nature" | "food" | "travel" | "activities" | "objects" | "symbols";

/** EmojiPicker 的界面文案与默认表情目录的名称。 */
export interface Messages {
  /** 未提供 label 时面板的可访问名称，也是浏览时的标题。 */
  readonly label: string;
  /** 搜索框的名称与占位文本。 */
  readonly search: string;
  /** 搜索结果标题。 */
  readonly results: string;
  /** 没有匹配结果时的提示。 */
  readonly empty: string;
  /** 分类导航的可访问名称。 */
  readonly categories: string;
  /** 常用快捷分组。 */
  readonly common: string;
  /** 最近使用快捷分组。 */
  readonly recent: string;
  /** 未归入任何分类的表情。 */
  readonly other: string;
  /** 默认分类名称。 */
  readonly groups: Readonly<Record<QuireKitEmojiDefaultGroup, string>>;
  /** 默认目录中各表情的名称，按 Unicode 值索引；缺失的名称回退到英文。所有内置语言的名称都参与搜索。 */
  readonly names: Readonly<Partial<Record<string, string>>>;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  label: "表情符号",
  search: "搜索表情",
  results: "搜索结果",
  empty: "没有匹配的表情",
  categories: "表情分类",
  common: "常用",
  recent: "最近使用",
  other: "其他",
  groups: {
    faces: "表情与人物",
    nature: "动物与自然",
    food: "食物与饮品",
    travel: "旅行与地点",
    activities: "活动与庆祝",
    objects: "物品",
    symbols: "符号"
  },
  names: {
    "😀": "开心", "😃": "大笑", "😄": "笑眯眯", "😁": "露齿笑", "😆": "眯眼笑", "😅": "汗笑", "😂": "笑哭", "🤣": "笑翻", "🙂": "微笑", "🙃": "倒脸",
    "😉": "眨眼", "😊": "害羞", "🥰": "喜欢", "😍": "爱慕", "🤩": "星星眼", "😘": "飞吻", "😋": "美味", "😎": "酷", "🥳": "庆祝", "🤔": "思考",
    "🤗": "拥抱", "🤭": "捂嘴", "🤫": "安静", "🤐": "保密", "😐": "平静", "🙄": "白眼", "😴": "睡觉", "🥱": "困了", "😢": "流泪", "😭": "大哭",
    "😱": "惊讶", "😡": "生气", "🥺": "请求", "😷": "口罩", "🤒": "生病", "🤯": "震惊", "👋": "挥手", "👌": "好的", "✌️": "胜利", "👍": "点赞",
    "👎": "不赞同", "👏": "鼓掌", "🙌": "欢呼", "🙏": "感谢", "🤝": "握手", "💪": "加油", "👀": "关注", "🧑‍💻": "开发者", "🐶": "小狗", "🐱": "小猫",
    "🐼": "熊猫", "🐻": "熊", "🦊": "狐狸", "🐰": "兔子", "🐸": "青蛙", "🐵": "猴子", "🐔": "小鸡", "🐧": "企鹅", "🦋": "蝴蝶", "🐝": "蜜蜂",
    "🐢": "乌龟", "🐬": "海豚", "🐳": "鲸鱼", "🦄": "独角兽", "🌱": "萌芽", "🌿": "绿叶", "🌳": "树", "🌸": "樱花", "🌻": "向日葵", "🌹": "玫瑰",
    "☀️": "晴天", "🌙": "月亮", "⭐": "星星", "🌈": "彩虹", "🔥": "火焰", "❄️": "雪花", "🍎": "苹果", "🍊": "橘子", "🍋": "柠檬", "🍌": "香蕉",
    "🍉": "西瓜", "🍇": "葡萄", "🍓": "草莓", "🍑": "桃子", "🥑": "牛油果", "🥕": "胡萝卜", "🍞": "面包", "🥐": "牛角包", "🍔": "汉堡", "🍟": "薯条",
    "🍕": "披萨", "🍜": "面条", "🍚": "米饭", "🥟": "饺子", "🍣": "寿司", "🎂": "生日蛋糕", "🍰": "蛋糕", "🍩": "甜甜圈", "🍪": "饼干", "🍫": "巧克力",
    "☕": "咖啡", "🍵": "茶", "🧋": "奶茶", "🥂": "干杯", "🚗": "汽车", "🚕": "出租车", "🚌": "公交车", "🚲": "自行车", "🚆": "火车", "🚄": "高铁",
    "✈️": "飞机", "🚀": "火箭", "🚢": "轮船", "🏠": "家", "🏢": "办公楼", "🏫": "学校", "🏥": "医院", "🏕️": "露营", "🏖️": "海滩", "🏔️": "山峰",
    "🗺️": "地图", "🌏": "地球", "🧭": "指南针", "🌅": "日出", "🎉": "庆祝", "🎊": "彩带", "🎈": "气球", "🎁": "礼物", "🏆": "奖杯", "🥇": "金牌",
    "🎯": "目标", "⚽": "足球", "🏀": "篮球", "🏐": "排球", "🎾": "网球", "🏓": "乒乓球", "🎮": "游戏", "🧩": "拼图", "🎨": "画画", "🎵": "音乐",
    "🎸": "吉他", "🎹": "钢琴", "🎬": "电影", "🎤": "唱歌", "💡": "灵感", "📌": "图钉", "📅": "日历", "⏰": "闹钟", "⌛": "沙漏", "💻": "电脑",
    "⌨️": "键盘", "📱": "手机", "📷": "相机", "🔍": "搜索", "📚": "书籍", "📝": "笔记", "✏️": "铅笔", "📎": "附件", "📁": "文件夹", "📊": "图表",
    "🔔": "通知", "📣": "公告", "🔒": "锁定", "🔑": "钥匙", "🔧": "工具", "⚙️": "设置", "🔗": "链接", "🧪": "实验", "❤️": "红心", "🧡": "橙心",
    "💛": "黄心", "💚": "绿心", "💙": "蓝心", "💜": "紫心", "🤍": "白心", "💔": "心碎", "✅": "完成", "❌": "错误", "⚠️": "警告", "🚫": "禁止",
    "❗": "感叹号", "❓": "问号", "💯": "满分", "✨": "闪亮", "♻️": "循环", "➕": "加号", "➖": "减号", "➡️": "向右", "⬅️": "向左", "⬆️": "向上",
    "⬇️": "向下", "🔄": "刷新"
  }
};

/** English. */
export const en: Messages = {
  label: "Emoji",
  search: "Search emoji",
  results: "Search results",
  empty: "No matching emoji",
  categories: "Emoji categories",
  common: "Common",
  recent: "Recently used",
  other: "Other",
  groups: {
    faces: "Faces and people",
    nature: "Animals and nature",
    food: "Food and drink",
    travel: "Travel and places",
    activities: "Activities",
    objects: "Objects",
    symbols: "Symbols"
  },
  names: {
    "😀": "grinning happy", "😃": "smiley smile", "😄": "smile happy", "😁": "beaming grin", "😆": "laughing",
    "😅": "sweat smile", "😂": "joy tears", "🤣": "rofl laughing", "🙂": "slightly smiling", "🙃": "upside down",
    "😉": "wink", "😊": "blush smile", "🥰": "love smiling hearts", "😍": "heart eyes", "🤩": "star struck", "😘": "kiss",
    "😋": "yum delicious", "😎": "sunglasses cool", "🥳": "partying celebration", "🤔": "thinking", "🤗": "hug",
    "🤭": "hand over mouth", "🤫": "shushing quiet", "🤐": "zipper mouth", "😐": "neutral", "🙄": "rolling eyes",
    "😴": "sleeping", "🥱": "yawning", "😢": "cry", "😭": "sob", "😱": "scream", "😡": "angry", "🥺": "pleading",
    "😷": "mask", "🤒": "thermometer sick", "🤯": "exploding head", "👋": "wave hello", "👌": "ok hand",
    "✌️": "victory peace", "👍": "thumbs up +1", "👎": "thumbs down -1", "👏": "clap", "🙌": "raised hands",
    "🙏": "pray thanks", "🤝": "handshake", "💪": "muscle strong", "👀": "eyes look", "🧑‍💻": "technologist developer",
    "🐶": "dog", "🐱": "cat", "🐼": "panda", "🐻": "bear", "🦊": "fox", "🐰": "rabbit", "🐸": "frog", "🐵": "monkey",
    "🐔": "chicken", "🐧": "penguin", "🦋": "butterfly", "🐝": "bee", "🐢": "turtle", "🐬": "dolphin", "🐳": "whale",
    "🦄": "unicorn", "🌱": "seedling", "🌿": "herb leaf", "🌳": "tree", "🌸": "cherry blossom", "🌻": "sunflower",
    "🌹": "rose", "☀️": "sun sunny", "🌙": "moon", "⭐": "star", "🌈": "rainbow", "🔥": "fire", "❄️": "snowflake",
    "🍎": "apple", "🍊": "orange", "🍋": "lemon", "🍌": "banana", "🍉": "watermelon", "🍇": "grapes", "🍓": "strawberry",
    "🍑": "peach", "🥑": "avocado", "🥕": "carrot", "🍞": "bread", "🥐": "croissant", "🍔": "burger", "🍟": "fries",
    "🍕": "pizza", "🍜": "noodles ramen", "🍚": "rice", "🥟": "dumpling", "🍣": "sushi", "🎂": "birthday cake", "🍰": "cake",
    "🍩": "doughnut", "🍪": "cookie", "🍫": "chocolate", "☕": "coffee", "🍵": "tea", "🧋": "bubble tea", "🥂": "cheers",
    "🚗": "car", "🚕": "taxi", "🚌": "bus", "🚲": "bicycle", "🚆": "train", "🚄": "high speed train", "✈️": "airplane",
    "🚀": "rocket", "🚢": "ship", "🏠": "house home", "🏢": "office", "🏫": "school", "🏥": "hospital", "🏕️": "camping",
    "🏖️": "beach", "🏔️": "mountain", "🗺️": "map", "🌏": "earth globe", "🧭": "compass", "🌅": "sunrise",
    "🎉": "tada party", "🎊": "confetti", "🎈": "balloon", "🎁": "gift", "🏆": "trophy", "🥇": "gold medal",
    "🎯": "target bullseye", "⚽": "soccer", "🏀": "basketball", "🏐": "volleyball", "🎾": "tennis", "🏓": "ping pong",
    "🎮": "video game", "🧩": "puzzle", "🎨": "art palette", "🎵": "music", "🎸": "guitar", "🎹": "piano", "🎬": "movie",
    "🎤": "microphone", "💡": "light bulb idea", "📌": "pin", "📅": "calendar date", "⏰": "alarm clock", "⌛": "hourglass",
    "💻": "laptop computer", "⌨️": "keyboard", "📱": "phone", "📷": "camera", "🔍": "search magnifier", "📚": "books",
    "📝": "memo note", "✏️": "pencil", "📎": "paperclip attachment", "📁": "folder", "📊": "bar chart",
    "🔔": "bell notification", "📣": "megaphone", "🔒": "lock", "🔑": "key", "🔧": "wrench", "⚙️": "gear settings",
    "🔗": "link", "🧪": "test tube", "❤️": "red heart love", "🧡": "orange heart", "💛": "yellow heart",
    "💚": "green heart", "💙": "blue heart", "💜": "purple heart", "🤍": "white heart", "💔": "broken heart",
    "✅": "check done", "❌": "cross no", "⚠️": "warning", "🚫": "prohibited", "❗": "exclamation", "❓": "question",
    "💯": "hundred perfect", "✨": "sparkles", "♻️": "recycle", "➕": "plus", "➖": "minus", "➡️": "right arrow",
    "⬅️": "left arrow", "⬆️": "up arrow", "⬇️": "down arrow", "🔄": "refresh"
  }
};
