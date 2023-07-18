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

const modelOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [],
  }),
};

const textStart =
  "Welcome to the autoria-parser tool! \n\nDeveloped by Dovban D.\n\nPackages used in app: puppeteer, telegram-bot-api";

const textChooseCar =
  "Choose the car to find among most popular or enter your own brand";

const textChooseModel = "Choose the car model to find";
const textError = "Try to use one of offered fields!";

bot.on("message", async (msg) => {
  // console.log(msg);

  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === "/start") {
    await bot.sendMessage(chatId, textStart);
    return bot.sendMessage(chatId, textChooseCar, brandOptions);
  }

  // if (carsArray.findIndex((txt) => txt === text)) {
  //   return bot.sendMessage(chatId, `find ${text}`);
  // }

  // it (msg.message === )

  // return bot.sendMessage(chatId, textError);

  // await page.keyboard.type('World', {delay: 100});
});

bot.on("callback_query", async (msg) => {
  // console.log(msg.data);

  const chatId = msg.message.chat.id;

  if (carsArray.findIndex((txt) => txt === msg.data)) {
    // searchParams.carBrand = msg.data;

    // console.log('success');

    const modelsArray = await scrapeModel("https://auto.ria.com/uk/", msg.data);

    modelsArray.forEach((item, index) => {
      const replyMarkup = JSON.parse(modelOptions.reply_markup);

      const newItem = { text: item, callback_data: item };

      if (index % 3 === 0) {
        replyMarkup.inline_keyboard.push([newItem]);
      } else {
        const lastIndex = replyMarkup.inline_keyboard.length - 1;
        replyMarkup.inline_keyboard[lastIndex].push(newItem);
      }

      modelOptions.reply_markup = JSON.stringify(replyMarkup);
    });

    return bot.sendMessage(chatId, textChooseModel, modelOptions);
  }
});
