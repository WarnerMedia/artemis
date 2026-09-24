import { i18n } from "@lingui/core";

import { messages as enMessages } from "locale/en/messages";

const locale = "en";

i18n.load(locale, enMessages);
i18n.activate(locale);

export { i18n };
