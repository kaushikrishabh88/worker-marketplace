import {
  useEffect,
  useMemo,
  useState,
} from "react";

import translations from "./translations";
import uiTranslations from "./uiTranslations";
import LanguageContext from "./LanguageContext";

const reverseUiTranslations = Object.fromEntries(
  Object.entries(uiTranslations).map(
    ([english, hindi]) => [hindi, english],
  ),
);

function translateText(text, language) {
  const trimmed = text.trim();

  if (!trimmed) {
    return text;
  }

  const dictionary =
    language === "hi"
      ? uiTranslations
      : reverseUiTranslations;

  const translated =
    dictionary[trimmed];

  if (!translated) {
    return text;
  }

  const leading =
    text.match(/^\s*/)?.[0] || "";

  const trailing =
    text.match(/\s*$/)?.[0] || "";

  return `${leading}${translated}${trailing}`;
}

function translateElement(root, language) {
  if (
    !root ||
    typeof document === "undefined"
  ) {
    return;
  }

  if (
    root.nodeType ===
    Node.TEXT_NODE
  ) {
    const parent =
      root.parentElement;

    if (
      parent &&
      ![
        "SCRIPT",
        "STYLE",
        "TEXTAREA",
        "CODE",
        "PRE",
      ].includes(
        parent.tagName,
      )
    ) {
      const translated =
        translateText(
          root.nodeValue || "",
          language,
        );

      if (
        translated !==
        root.nodeValue
      ) {
        root.nodeValue =
          translated;
      }
    }

    return;
  }

  if (
    root.nodeType !==
      Node.ELEMENT_NODE &&
    root.nodeType !==
      Node.DOCUMENT_FRAGMENT_NODE
  ) {
    return;
  }

  if (
    root.nodeType ===
    Node.ELEMENT_NODE
  ) {
    [
      "placeholder",
      "title",
      "aria-label",
    ].forEach(
      (attribute) => {
        if (
          !root.hasAttribute(
            attribute,
          )
        ) {
          return;
        }

        const current =
          root.getAttribute(
            attribute,
          ) || "";

        const translated =
          translateText(
            current,
            language,
          );

        if (
          translated !==
          current
        ) {
          root.setAttribute(
            attribute,
            translated,
          );
        }
      },
    );
  }

  const walker =
    document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent =
            node.parentElement;

          if (
            !parent ||
            [
              "SCRIPT",
              "STYLE",
              "TEXTAREA",
              "CODE",
              "PRE",
            ].includes(
              parent.tagName,
            )
          ) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

  const textNodes = [];

  while (
    walker.nextNode()
  ) {
    textNodes.push(
      walker.currentNode,
    );
  }

  textNodes.forEach(
    (node) => {
      const translated =
        translateText(
          node.nodeValue ||
            "",
          language,
        );

      if (
        translated !==
        node.nodeValue
      ) {
        node.nodeValue =
          translated;
      }
    },
  );

  if (
    root.querySelectorAll
  ) {
    root
      .querySelectorAll(
        "[placeholder], [title], [aria-label]",
      )
      .forEach(
        (element) => {
          [
            "placeholder",
            "title",
            "aria-label",
          ].forEach(
            (attribute) => {
              if (
                !element.hasAttribute(
                  attribute,
                )
              ) {
                return;
              }

              const current =
                element.getAttribute(
                  attribute,
                ) || "";

              const translated =
                translateText(
                  current,
                  language,
                );

              if (
                translated !==
                current
              ) {
                element.setAttribute(
                  attribute,
                  translated,
                );
              }
            },
          );
        },
      );
  }
}

export function LanguageProvider({
  children,
}) {
  const [
    language,
    setLanguage,
  ] = useState(() => {
    const savedLanguage =
      localStorage.getItem(
        "workmateLanguage",
      );

    if (
      savedLanguage === "hi" ||
      savedLanguage === "en"
    ) {
      return savedLanguage;
    }

    return "en";
  });

  useEffect(() => {
    document.documentElement.lang =
      language === "hi"
        ? "hi"
        : "en";

    const root =
      document.getElementById(
        "root",
      );

    if (!root) {
      return undefined;
    }

    translateElement(
      root,
      language,
    );

    const observer =
      new MutationObserver(
        (mutations) => {
          mutations.forEach(
            (mutation) => {
              if (
                mutation.type ===
                "characterData"
              ) {
                translateElement(
                  mutation.target,
                  language,
                );

                return;
              }

              mutation.addedNodes.forEach(
                (node) => {
                  translateElement(
                    node,
                    language,
                  );
                },
              );
            },
          );
        },
      );

    observer.observe(
      root,
      {
        childList: true,
        subtree: true,
        characterData: true,
      },
    );

    return () => {
      observer.disconnect();
    };
  }, [language]);

  const value =
    useMemo(() => {
      const changeLanguage = (
        newLanguage,
      ) => {
        if (
          newLanguage !== "en" &&
          newLanguage !== "hi"
        ) {
          return;
        }

        if (
          newLanguage === language
        ) {
          return;
        }

        localStorage.setItem(
          "workmateLanguage",
          newLanguage,
        );

        window.location.reload();
      };

      const t = (
        key,
      ) => {
        return (
          translations[
            language
          ]?.[key] ||
          translations.en?.[
            key
          ] ||
          key
        );
      };

      return {
        language,
        changeLanguage,
        t,
      };
    }, [language]);

  return (
    <LanguageContext.Provider
      value={value}
    >
      {children}
    </LanguageContext.Provider>
  );
}