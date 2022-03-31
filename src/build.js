import fs from "fs";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import config from "./config.js";

const DOCS_DIR = path.resolve("./docs");
const OUTPUT_DIR = path.resolve("./dist");
const NAVIGATION = fs.readdirSync(DOCS_DIR).sort((a, b) => {
    const regex = /[0-9]+/;
    const [numA] = a.match(regex) || [-1];
    const [numB] = b.match(regex) || [-1];

    return +numA - +numB;
});
const TEMPLATE = fs.readFileSync(
    path.resolve("./src/template/index.html"),
    "utf-8"
);

function getFileName(fileNameWithExtension) {
    return path.basename(
        fileNameWithExtension,
        path.extname(fileNameWithExtension)
    );
}

function createNavigation(fileNameWithExtension) {
    const fileName = getFileName(fileNameWithExtension);

    return `<ul>${NAVIGATION.map((file) => {
        const name = getFileName(file);

        if (name === "index") {
            return `<li><a href="/">${config.defaultTitle}</a></li>`;
        }

        return `<li${
            name === fileName ? ' class="highlight"' : ""
        }><a href="/${encodeURIComponent(name)}.html">${name}</a></li$>`;
    }).reduce((acc, cur) => acc + cur, "")}</ul>`;
}

function createFile({ fileName, content, toc, info }) {
    const { title, author, date, description } = info;
    const descriptionFromContent = content
        .replace(/<.+?>/gm, "")
        .replace(/(\r?\n)+/gm, " ")
        .slice(0, 200);
    const templated = TEMPLATE.replace("<!-- CONTENT -->", content)
        .replace(/<!-- TITLE -->/gm, title)
        .replace(
            /<!-- DESCRIPTION -->/gm,
            description || descriptionFromContent
        )
        .replace(/<!-- DATE -->/gm, new Date(date).toISOString())
        .replace(/<!-- AUTHOR -->/gm, author)
        .replace(/<!-- TOC -->/gm, toc)
        .replace(/<!-- NAVIGATION -->/gm, createNavigation(fileName))
        .replace(/(src=|href=|url\()"\//g, `$1"${config.baseURL}`);

    fs.writeFileSync(path.resolve(OUTPUT_DIR, fileName), templated);
}

function parseInfo(regexMatchGroup, fileName) {
    const defaultValue = {
        title: fileName,
        author: "Anonymous",
        date: new Date().toISOString(),
        description: "",
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

function addTocTitleToData(data) {
    const h1Regex = /^# .+/gm;
    const [matchHeading] = data.match(h1Regex) || [];

    if (matchHeading) {
        return data.replace(h1Regex, `${matchHeading}\n## Table of contents\n`);
    }

    return `## Table of contents\n${data}`;
}

function parseTocFromContent(content) {
    const lineBreakFormatted = content.replace(/\r?\n/gm, "\n");
    const contentArray = lineBreakFormatted.split("\n");
    const { length } = contentArray;
    let ulOpenedCnt = 0;
    let ulClosedCnt = 0;
    const startIndex = contentArray.indexOf(
        '<h2 id="table-of-contents">Table of contents</h2>'
    );
    let endIndex = 0;

    for (let i = startIndex; i <= length; i++) {
        const currentLine = contentArray[i];

        if (currentLine === "<ul>") {
            ulOpenedCnt++;
        }

        if (currentLine === "</ul>") {
            ulClosedCnt++;
        }

        if (0 < ulClosedCnt && ulOpenedCnt === ulClosedCnt) {
            endIndex = i + 1;
            break;
        }
    }

    return {
        content: `${contentArray.slice(0, startIndex).join("\n")}${contentArray
            .slice(endIndex)
            .join("\n")}`,
        toc: `<div class="toc-container"><ul class="toc">${contentArray
            .slice(startIndex + 2, endIndex)
            .join("")}</div>`,
    };
}

async function parseFile(fileName) {
    const commentsRegex = /^<!--((.|\r?\n)*)-->$/gm;
    const data = fs.readFileSync(path.resolve(DOCS_DIR, fileName), "utf-8");
    const parsed = `${await unified()
        .use(remarkParse)
        .use(remarkToc)
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(remarkGfm)
        .use(rehypeStringify)
        .process(addTocTitleToData(data))}`;
    const { content, toc } = parseTocFromContent(parsed);

    createFile({
        fileName: `${path.basename(fileName, path.extname(fileName))}.html`,
        content,
        info: parseInfo(data.match(commentsRegex), fileName),
        toc,
    });
}

function main() {
    fs.mkdir(OUTPUT_DIR, { recursive: true }, (err) => {
        if (err) throw err;
    });
    fs.readdirSync(DOCS_DIR).forEach(parseFile);
}

main();
