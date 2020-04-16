import plusnew, {
  Component,
  ApplicationElement,
  Props,
  store,
  context,
} from "@plusnew/core";
import { PromiseType, mapObject } from "./util/functional";

type settingsTemplate = {
  fallbackLanguage: string;
  translations: {
    [key: string]: (language: string) => Promise<{}>;
  };
};

type resolvedLanguage<T extends settingsTemplate> = {
  [namespace in keyof T["translations"]]: () => null | PromiseType<
    ReturnType<T["translations"][namespace]>
  >;
};

type providerProps = {
  language: string;
  children: ApplicationElement;
};

type consumerProps<T extends settingsTemplate> = {
  children: (settings: resolvedLanguage<T>) => ApplicationElement;
};

type languageCache<T extends settingsTemplate> = {
  [language: string]: Partial<
    {
      [namespace in keyof T["translations"]]: languageCachedEntity<
        PromiseType<ReturnType<T["translations"][namespace]>>
      >;
    }
  >;
};

type languageCachedEntity<T> =
  | {
      error: false;
      data: T;
    }
  | { error: true };

export default function factory<T extends settingsTemplate>(settings: T) {
  const i18n = context<
    { cachedLanguages: languageCache<T>; currentLanguage: string },
    { language: string; namespace: string }
  >();

  const loadingNamespaces: { namespace: string; language: string }[] = [];

  return {
    Provider: class Provider extends Component<providerProps> {
      static displayName = "I18nProvider";
      render(Props: Props<providerProps>) {
        const cachedLanguages = store<
          languageCache<T>,
          | {
              type: "LANGUAGE_RESULT";
              language: string;
              namespace: string;
              data: any;
            }
          | {
              type: "LANGUAGE_ERROR";
              language: string;
              namespace: string;
            }
        >({}, (currentState, action) => {
          return {
            ...currentState,
            [action.language]: {
              ...currentState[action.language],
              [action.namespace]:
                action.type === "LANGUAGE_RESULT"
                  ? {
                      error: false,
                      data: action.data,
                    }
                  : {
                      error: true,
                    },
            },
          };
        });

        function loadNamespace({
          language,
          namespace,
        }: {
          language: string;
          namespace: string;
        }) {
          if (
            loadingNamespaces.find(
              (loadingNamespace) =>
                loadingNamespace.language === language &&
                loadingNamespace.namespace === namespace
            ) === undefined
          ) {
            loadingNamespaces.push({ namespace, language: language });

            const languagePromise = settings.translations[namespace](language);

            languagePromise.catch(() => {
              cachedLanguages.dispatch({
                type: "LANGUAGE_ERROR",
                language: language,
                namespace,
              });
            });

            languagePromise.then((data) => {
              cachedLanguages.dispatch({
                type: "LANGUAGE_RESULT",
                data,
                language,
                namespace,
              });
            });
          }
        }
        return (
          <cachedLanguages.Observer>
            {(cachedLanguagesState) => (
              <Props>
                {(props) => (
                  <i18n.Provider
                    state={{
                      cachedLanguages: cachedLanguagesState,
                      currentLanguage: props.language,
                    }}
                    dispatch={loadNamespace}
                  >
                    {props.children}
                  </i18n.Provider>
                )}
              </Props>
            )}
          </cachedLanguages.Observer>
        );
      }
    },
    Consumer: class Consumer extends Component<consumerProps<T>> {
      static displayName = "I18nConsumer";
      render(Props: Props<consumerProps<T>>) {
        return (
          <i18n.Consumer>
            {(i18nState, loadNamespace) => {
              function getLanguageResult(
                language: string,
                namespaceName: string
              ): any {
                const cachedLanguage = i18nState.cachedLanguages[language]?.[
                  namespaceName
                ] as languageCachedEntity<any>;

                if (cachedLanguage) {
                  if (cachedLanguage.error === true) {
                    if (language === settings.fallbackLanguage) {
                      throw new Error(
                        `Could not load namespace ${namespaceName} for language ${language}`
                      );
                    }

                    return getLanguageResult(
                      settings.fallbackLanguage,
                      namespaceName
                    );
                  }

                  return cachedLanguage.data;
                }
                loadNamespace({ language, namespace: namespaceName as string });

                return null;
              }

              const settingsContainer = mapObject(
                settings.translations,
                (_namespace, namespaceName) => () =>
                  getLanguageResult(
                    i18nState.currentLanguage,
                    namespaceName as string
                  )
              );
              return (
                <Props>
                  {(props) => (props.children as any)[0](settingsContainer)}
                </Props>
              );
            }}
          </i18n.Consumer>
        );
      }
    },
  };
}
