export const searchParams = {
  carBrand: null,
  carModel: null,
  carYearFrom: null,
  carYearTo: null,
  carBudgetFrom: null,
  carBudgetTo: null,
};

export const currYear = new Date().getFullYear();

export const textStart =
  "Welcome to the autoria-parser tool! \n\nDeveloped by Dovban D.\n\nPackages used in app: puppeteer, node-telegram-bot-api";

export const textChooseCar = `Оберіть марку для пошуку або введіть свій варіант`;

export const textChooseModel = "Оберіть модель для пошуку";

export const textSpecificModel =
  "Будь ласка, оберіть модель із запропонованого списку";

export const textChooseYearFrom = `Вкажіть рік для пошуку ВІД (1900 - ${currYear}) в чат або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;
export const textChooseYearTo = `Вкажіть рік для пошуку ДО (1900 - ${currYear}) в чат або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;

export const numberPattern = /^[0-9]+$/;
export const budgetPattern = /^[0-9]*\$?$/;

export const textValidYear = `Вкажіть валідний рік, від 1900 до ${currYear} або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;
export const textValidBudg = `Вкажіть коректний бюджет (> 0)`;

export const textChooseBudgetFrom = `Вкажіть бюджет ВІД (цілі числа, $) або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;
export const textChooseBudgetTo = `Вкажіть бюджет ДО (цілі числа, $) або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;
export const textError =
  "При завантаженні варіантів виникла помилка. Спробуйте ще раз...";

// export let filter: string = `\nВаші налаштування:\n`;

// export let actualContext: string = "brand";
// export let lastMessageId;
// export let lastUserMessageId;
// export let editStatus = false;
// export let sentCars = [];
// export let page = 0;
// export const autoSearchData = {};
// export let currBrand;
// export let currModel;
