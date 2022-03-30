import fs from "fs";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import rehypeStringify from "rehype-stringify";
import config from "./config.js";

const DOCS_DIR = path.resolve("./docs");
const OUTPUT_DIR = path.resolve("./dist");
const NAVIGATION = `<ul>${fs
    .readdirSync(DOCS_DIR)
    .sort((a, b) => {
        const regex = /[0-9]+/;
        const [numA] = a.match(regex) || [-1];
        const [numB] = b.match(regex) || [-1];

        return +numA - +numB;
    })
    .map((file) => {
        const extension = path.extname(file);
        const name = path.basename(file, extension);

        if (name === "index") {
            return `<li><a href="/">${config.defaultTitle}</a></li>`;
        }

        return `<li><a href="/${encodeURIComponent(
            name
        )}.html">${name}</a></li>`;
    })
    .reduce((acc, cur) => acc + cur, "")}</ul>`;
const TEMPLATE = fs.readFileSync(
    path.resolve("./src/template/index.html"),
    "utf-8"
);

function createFile({ fileName, content, info }) {
    const { title, author, date } = info;
    const templated = TEMPLATE.replace("<!-- CONTENT -->", content)
        .replace("<!-- TITLE -->", title)
        .replace("<!-- DATE -->", new Date(date).toISOString())
        .replace("<!-- AUTHOR -->", author)
        .replace("<!-- NAVIGATION -->", NAVIGATION)
        .replace(/(src|href)="\//g, `$1="${config.baseURL}`);

    fs.writeFileSync(path.resolve(OUTPUT_DIR, fileName), templated);
}

function parseInfo(regexMatchGroup, fileName) {
    const defaultValue = {
        title: fileName,
        author: "Anonymous",
        date: `${new Date().toISOString()}`,
    };

    if (!regexMatchGroup) {
        return defaultValue;
    }

    const [matchString] = regexMatchGroup;

    return {
        ...defaultValue,
        ...Object.fromEntries(
            matchString
                .replace(/(<!)?-->?/gm, "")
                .replace(/\r?\n/gm, "\n")
                .split("\n")
                .filter((x) => x !== "")
                .map((x) => x.split(":"))
                .map(([key, value]) => [key.trim(), value.trim()])
        ),
    };
}

async function parseFile(fileName) {
    const commentsRegex = /^<!--((.|\r?\n)*)-->$/gm;
    const data = fs.readFileSync(path.resolve(DOCS_DIR, fileName), "utf-8");
    const parsed = await unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(remarkGfm)
        .use(rehypeStringify)
        .process(data);

    createFile({
        fileName: `${path.basename(fileName, path.extname(fileName))}.html`,
        content: `${parsed}`,
        info: parseInfo(data.match(commentsRegex), fileName),
    });
}

function main() {
    fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
        if (err) throw err;
    });
    fs.readdirSync(DOCS_DIR).forEach(parseFile);
}

main();
