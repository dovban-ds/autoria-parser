import tgApi from "node-telegram-bot-api";
import { scrapeAuto } from "./scrappers.js";

const token = "6141548364:AAFsjvvVosav-H-q7rHGOTl4L97Z_7oeCs8";

const bot = new tgApi(token, { polling: true });

// const brandOptions = {
//   reply_markup: JSON.stringify({
//     inline_keyboard: [[{ text: "btn txt", callback_data: "btn return" }]],
//   }),
// };

const brandOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [],
  }),
};

// console.log(brandOptions);

const carsArray = await scrapeAuto("https://auto.ria.com/uk/");

console.log(carsArray);

carsArray.forEach((item) => {
  const replyMarkup = JSON.parse(brandOptions.reply_markup);
  replyMarkup.inline_keyboard.push([{ text: item, callback_data: item }]);
  brandOptions.reply_markup = JSON.stringify(replyMarkup);
});

const textStart =
  "Welcome to the autoria-parser tool! \n\nDeveloped by Dovban D.\n\nPackages used in app: puppeteer, telegram-bot-api";

const textChooseCar =
  "Choose the car to find among most popular or enter your own brand";

const textError = "Try to use one of offered fields!";

bot.on("message", async (msg) => {
  // console.log(msg);

  const text = msg.text;
  const chatId = msg.chat.id;

  if (text === "/start") {
    await bot.sendMessage(chatId, textStart);
    return bot.sendMessage(chatId, textChooseCar, brandOptions);
  }

  return bot.sendMessage(chatId, textError);
});
