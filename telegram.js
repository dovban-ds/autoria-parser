import tgApi from "node-telegram-bot-api";
import { scrapeAuto, scrapeFullInfo, scrapeModel } from "./scrappers.js";

const token = "6141548364:AAFsjvvVosav-H-q7rHGOTl4L97Z_7oeCs8";

const bot = new tgApi(token, { polling: true });

const searchParams = {
  carBrand: null,
  carModel: null,
  carYearFrom: null,
  carYearTo: null,
  carBudgetFrom: null,
  carBudgetTo: null,
};

const brandOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [],
  }),
};
let modelOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [],
  }),
};

const carsArray = await scrapeAuto("https://auto.ria.com/uk/");

// console.log(carsArray);

carsArray.forEach((item, index) => {
  const replyMarkup = JSON.parse(brandOptions.reply_markup);

  const newItem = { text: item, callback_data: item };

  if (index % 2 === 0) {
    replyMarkup.inline_keyboard.push([newItem]);
  } else {
    const lastIndex = replyMarkup.inline_keyboard.length - 1;
    replyMarkup.inline_keyboard[lastIndex].push(newItem);
  }

  brandOptions.reply_markup = JSON.stringify(replyMarkup);
});

const currYear = new Date().getFullYear();

const textStart =
  "Welcome to the autoria-parser tool! \n\nDeveloped by Dovban D.\n\nPackages used in app: puppeteer, telegram-bot-api";

const textChooseCar = `Choose the car to find among the most popular or enter your own brand`;

const textChooseModel = "Choose the car model to find";

const textSpecificBrand =
  "Let me try to find this brand ... \nOr choose among the most popular";
const textSpecificModel = "Please select the model in provided list";

const textChooseYearFrom = `Now enter a year FROM (1900 - ${currYear}) in a chat or press restart button`;
const textChooseYearTo = `Now pick a year TO (1900 - ${currYear}) in a chat or press restart button`;

const numberPattern = /^[0-9]+$/;
const budgetPattern = /^[0-9]*\$?$/;

const textValidYear = `Input valid year from 1900 to ${currYear} or press restart/skip`;
const textValidBudg = `Input valid budget 0<`;

const textChooseBudgetFrom = `Specify budget FROM (integers only, $) or press restart/skip`;
const textChooseBudgetTo = `Specify budget TO (integers only, $) or press restart/skip`;
const textError = "Error occurred while fetching models. Please try again.";

let actualContext = "brand";
let lastMessageId;

bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === "/start") {
    await bot.sendMessage(chatId, textStart);
    return bot
      .sendMessage(chatId, textChooseCar, brandOptions)
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      });
  } else if (actualContext === "brand") {
    return bot
      .editMessageText(textSpecificBrand, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: brandOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      });
  } else if (actualContext === "model") {
    return bot
      .editMessageText(textSpecificModel, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: modelOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      });
  } else if (
    (actualContext === "budgetFrom" || actualContext === "budgetTo") &&
    !budgetPattern.test(text)
  ) {
    return bot
      .editMessageText(textValidBudg, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      });
  } else if (
    (actualContext === "budgetFrom" || actualContext === "budgetTo") &&
    searchParams.carBudgetFrom &&
    text < searchParams.carBudgetFrom
  ) {
    const textValidB = `Input valid budget, more or equal ${searchParams.carBudgetFrom}`;

    return bot
      .editMessageText(textValidB, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      });
  } else if (actualContext === "budgetFrom" && budgetPattern.test(text)) {
    const budgFrom = text
      .split("")
      .filter((char) => char !== "$")
      .join("");
    searchParams.carBudgetFrom = budgFrom;

    return bot
      .editMessageText(textChooseBudgetTo, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "budgetTo"));
  } else if (actualContext === "budgetTo" && budgetPattern.test(text)) {
    const budgTo = text
      .split("")
      .filter((char) => char !== "$")
      .join("");
    searchParams.carBudgetTo = budgTo;

    scrapeFullInfo("https://auto.ria.com/uk/", searchParams);

    return bot
      .editMessageText("success", {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then(() => (actualContext = "finish"));
  } else if (
    ((actualContext === "yearFrom" || actualContext === "yearTo") &&
      !numberPattern.test(text)) ||
    text < 1900 ||
    text > currYear
  ) {
    return bot.sendMessage(chatId, textValidYear, {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            { text: "Skip", callback_data: "Skip" },
            { text: "Restart", callback_data: "Restart" },
          ],
        ],
      }),
    });
  } else if (
    (actualContext === "yearFrom" || actualContext === "yearTo") &&
    text < searchParams.carYearFrom
  ) {
    const textValidYearFromTo = `Input valid year, bigger or equal ${searchParams.carYearFrom}`;

    return bot.sendMessage(chatId, textValidYearFromTo, {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            { text: "Skip", callback_data: "Skip" },
            { text: "Restart", callback_data: "Restart" },
          ],
        ],
      }),
    });
  } else if (actualContext === "yearFrom" && numberPattern.test(text)) {
    searchParams.carYearFrom = text;

    return bot
      .editMessageText(textChooseYearTo, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "yearTo"));
  } else if (actualContext === "yearTo" && numberPattern.test(text)) {
    searchParams.carYearTo = text;

    return bot
      .editMessageText(textChooseBudgetFrom, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "budgetFrom"));
  }
});

let models = null;

bot.on("callback_query", async (msg) => {
  // console.log(msg);

  const chatId = msg.message.chat.id;
  const messageId = msg.message.message_id;

  // console.log(msg.message.text);

  if (
    carsArray.findIndex((txt) => txt === msg.data) !== -1 &&
    msg.data !== "Restart"
  ) {
    modelOptions = {
      reply_markup: JSON.stringify({
        inline_keyboard: [],
      }),
    };

    searchParams.carBrand = msg.data;
    try {
      const modelsArray = await scrapeModel(
        "https://auto.ria.com/uk/",
        msg.data
      );

      modelsArray.forEach((item, index) => {
        const replyMarkup = JSON.parse(modelOptions.reply_markup);

        const newItem = { text: item, callback_data: item };

        if (index % 3 === 0) {
          replyMarkup.inline_keyboard.push([newItem]);
        } else {
          const lastIndex = replyMarkup.inline_keyboard.length - 1;
          replyMarkup.inline_keyboard[lastIndex].push(newItem);
        }

        if (index === modelsArray.length - 1)
          replyMarkup.inline_keyboard.push([
            { text: "Restart", callback_data: "Restart" },
          ]);

        modelOptions.reply_markup = JSON.stringify(replyMarkup);
      });

      models = modelsArray;

      return bot
        .editMessageText(textChooseModel, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: modelOptions.reply_markup,
        })
        .then(() => (actualContext = "model"));
    } catch (error) {
      console.error("Error while scraping models:", error.message);
      return bot.sendMessage(chatId, textError);
    }
  } else if (msg.data === "Skip" && actualContext === "yearFrom") {
    return bot
      .editMessageText(textChooseYearTo, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "yearTo"));
  } else if (msg.data === "Skip" && actualContext === "yearTo") {
    return bot
      .editMessageText(textChooseBudgetFrom, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "budgetFrom"));
  } else if (msg.data === "Skip" && actualContext === "budgetFrom") {
    return bot
      .editMessageText(textChooseBudgetTo, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "budgetTo"));
  } else if (msg.data === "Skip" && actualContext === "budgetTo") {
    scrapeFullInfo("https://auto.ria.com/uk/", searchParams);

    return bot
      .editMessageText("success", {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then(() => (actualContext = "finish"));
  } else if (msg.data === "Restart") {
    return bot
      .editMessageText(textChooseCar, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: brandOptions.reply_markup,
      })
      .then(() => (actualContext = "brand"));
  } else if (models.findIndex((txt) => txt === msg.data) !== -1) {
    searchParams.carModel = msg.data;

    lastMessageId = messageId;

    return bot
      .editMessageText(textChooseYearFrom, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Skip", callback_data: "Skip" },
              { text: "Restart", callback_data: "Restart" },
            ],
          ],
        }),
      })
      .then(() => (actualContext = "yearFrom"));
  }
});
