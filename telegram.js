import tgApi from "node-telegram-bot-api";
import { scrapeAuto, scrapeModel } from "./scrappers.js";

const token = "6141548364:AAFsjvvVosav-H-q7rHGOTl4L97Z_7oeCs8";

const bot = new tgApi(token, { polling: true });

// const brandOptions = {
//   reply_markup: JSON.stringify({
//     inline_keyboard: [[{ text: "btn txt", callback_data: "btn return" }]],
//   }),
// };

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

// console.log(brandOptions);

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

const textStart =
  "Welcome to the autoria-parser tool! \n\nDeveloped by Dovban D.\n\nPackages used in app: puppeteer, telegram-bot-api";

const textChooseCar = `Choose the car to find among the most popular or enter your own brand`;

const textChooseModel = "Choose the car model to find";

const textSpecificBrand =
  "Let me try to find this brand ... \nOr choose among the most popular";

let actualContext = "initial";

bot.on("message", async (msg) => {
  console.log();

  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === "/start") {
    await bot.sendMessage(chatId, textStart);
    return bot.sendMessage(chatId, textChooseCar, brandOptions);
  } else if (actualContext === "initial") {
    return bot.sendMessage(chatId, textSpecificBrand, brandOptions);
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
    const modelOptions = {
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

      models = modelsArray;

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

      return bot.editMessageText(textChooseModel, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: modelOptions.reply_markup,
      });
    } catch (error) {
      console.error("Error while scraping models:", error.message);
      return bot.sendMessage(
        chatId,
        "Error occurred while fetching models. Please try again later."
      );
    }
  } else if (msg.data === "Restart") {
    return bot.editMessageText(textChooseCar, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: brandOptions.reply_markup,
    });
  } else if (models.findIndex((txt) => txt === msg.data) !== -1) {
    searchParams.carModel = msg.data;

    console.log(searchParams);
  }
});
