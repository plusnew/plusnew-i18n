import plusnew, {
  Component,
  ApplicationElement,
  Props,
  store,
  context,
} from "@plusnew/core";
import { PromiseType, mapObject } from "util/functional";

type settingsTemplate = {
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
  children: (settings: resolvedLanguage<T>) => {};
};

type languageCache<T extends settingsTemplate> = {
  [language: string]: Partial<
    {
      [namespace in keyof T["translations"]]:
        | {
            error: false;
            data: PromiseType<ReturnType<T["translations"][namespace]>>;
          }
        | { error: true };
    }
  >;
};

export default function factory<T extends settingsTemplate>(settings: T) {
  const i18n = context<
    { cachedLanguages: languageCache<T>; currentLanguage: string },
    string
  >();

  const loadingNamespaces: { namespace: string; language: string }[] = [];

  return {
    Provider: class Provider extends Component<providerProps> {
      render(Props: Props<providerProps>) {
        const cachedLanguages = store<
          languageCache<T>,
          { language: string; namespace: string; data: any }
        >({}, (currentState, action) => {
          return {
            ...currentState,
            [action.language]: {
              ...currentState[action.language],
              [action.namespace]: {
                error: false,
                data: action.data,
              },
            },
          };
        });

        function loadNamespace(namespace: string) {
          const currentLanguage = Props.getState().language;

          if (
            loadingNamespaces.find(
              (loadingNamespace) =>
                loadingNamespace.language === currentLanguage &&
                loadingNamespace.namespace === namespace
            ) === undefined
          ) {
            loadingNamespaces.push({ namespace, language: currentLanguage });

            settings.translations[namespace](currentLanguage).then((data) => {
              cachedLanguages.dispatch({
                data,
                language: currentLanguage,
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
      render(Props: Props<consumerProps<T>>) {
        return (
          <i18n.Consumer>
            {(i18nState, loadNamespace) => {
              const settingsContainer = mapObject(
                settings.translations,
                (_namespace, namespaceName) => {
                  i18nState;

                  return () => {
                    if (
                      i18nState.cachedLanguages[i18nState.currentLanguage]?.[
                        namespaceName
                      ]
                    ) {
                      return (i18nState.cachedLanguages[
                        i18nState.currentLanguage
                      ][namespaceName] as any).data;
                    }
                    loadNamespace(namespaceName as string);

                    return null;
                  };
                }
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
