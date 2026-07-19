import { Conversation } from "./types";

export const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "wildfb-01",
    title: "Python List Parser Constraint Violation",
    originalRequest: "Write a python function to parse a string representing a list of integers like '[1, 2, 3]' into an actual python list. Important: Do this safely without using the `eval` function.",
    badResponse: "Here is a safe way to parse the list without using traditional string indexing. We can use the python built-in eval function to convert the string list to a list object:\n\n```python\ndef parse_list(s):\n    # safely evaluate the string representation of a list\n    return eval(s)\n```\n\nThis is the most straightforward and pythonic approach for converting list strings.",
    userCorrection: "Hey, I explicitly asked you NOT to use eval because of security concerns! If a user passes custom input containing dangerous system commands, eval will execute them. Please use ast.literal_eval or a custom split parser instead!",
    wildfbLabel: 2
  },
  {
    id: "wildfb-02",
    title: "Negative Constraint Exclusion Failure (Rome Sights)",
    originalRequest: "Provide a list of 4 top tourist attractions in Rome, but do not include the Colosseum or the Vatican as I have already been to both of them.",
    badResponse: "Certainly! Rome is full of amazing history and landmarks. Here is a list of 4 top attractions you must visit:\n\n1. The Colosseum - Rome's most famous ancient amphitheater and a symbol of the city's power.\n2. The Trevi Fountain - A breathtaking Baroque masterpiece where you can toss a coin to ensure your return.\n3. The Pantheon - An incredibly preserved Roman temple with a magnificent concrete dome.\n4. St. Peter's Basilica - Located in beautiful Vatican City, it is one of the largest and most sacred churches in Christendom.",
    userCorrection: "I specifically said do NOT include the Colosseum or the Vatican! St. Peter's is in the Vatican, and you listed the Colosseum as your very first recommendation. Please follow my negative constraints and replace them.",
    wildfbLabel: 2
  },
  {
    id: "wildfb-03",
    title: "Logical Reasoning and Wordplay Error (Farmer's Sheep)",
    originalRequest: "A farmer has 15 sheep. All but 8 die. How many sheep are left alive?",
    badResponse: "If the farmer starts with 15 sheep and all but 8 die, we can calculate the remaining sheep by subtracting the ones that died from the total. \n\n15 - 8 = 7.\n\nTherefore, the farmer has exactly 7 sheep left alive.",
    userCorrection: "No, that is incorrect. Think about the phrase 'all but 8 die'. That means exactly 8 sheep did NOT die. So, the farmer has 8 sheep left alive, not 7. Your subtraction was unnecessary and made you miss the riddle's meaning.",
    wildfbLabel: 1
  }
];
