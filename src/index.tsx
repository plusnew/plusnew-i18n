import { Component, ApplicationElement } from "@plusnew/core";

type PromiseType<P extends Promise<any>> = P extends Promise<infer A>
  ? A
  : never;

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

export default function factory<T extends settingsTemplate>(_settings: T) {
  return {
    Provider: class Provider extends Component<providerProps> {
      render() {
        return null;
      }
    },
    Consumer: class Consumer extends Component<consumerProps<T>> {
      render() {
        return null;
      }
    },
  };
}
