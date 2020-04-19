import plusnew, { component, store, Try } from "@plusnew/core";
import enzymeAdapterPlusnew, { mount } from "@plusnew/enzyme-adapter";
import { configure } from "enzyme";
import i18nFactory from "./index";

configure({ adapter: new enzymeAdapterPlusnew() });

function nextTick() {
  return new Promise((resolve) => resolve());
}

describe("test i18nFactory", () => {
  it("caching from namespaces", async () => {
    const translations = {
      base: jest.fn((language: string) =>
        Promise.resolve({
          foo: {
            bar: `bar-${language}`,
            baz: `baz-${language}`,
          },
        })
      ),
    };
    const i18n = i18nFactory({
      fallbackLanguage: "en",
      translations,
    });

    const language = store("de");

    const MainComponent = component("MainComponent", () => (
      <language.Observer>
        {(languageState) => (
          <i18n.Provider language={languageState}>
            <i18n.Consumer>
              {({ base }) => <span>{base()?.foo.bar ?? "loading"}</span>}
            </i18n.Consumer>
            <i18n.Consumer>
              {({ base }) => <div>{base()?.foo.baz ?? "loading"}</div>}
            </i18n.Consumer>
          </i18n.Provider>
        )}
      </language.Observer>
    ));

    const wrapper = mount(<MainComponent />);

    // When initially base() is called, the function should return null and call the settings.base(de)
    expect(wrapper.contains(<span>loading</span>)).toBe(true);
    expect(wrapper.contains(<div>loading</div>)).toBe(true);
    expect(translations.base).toHaveBeenCalledTimes(1);

    await nextTick();

    // When the promise is resolved, the component should be updated
    expect(wrapper.contains(<span>bar-de</span>)).toBe(true);
    expect(wrapper.contains(<div>baz-de</div>)).toBe(true);
    expect(translations.base).toHaveBeenCalledTimes(1);

    language.dispatch("en");

    // When language got changed, the function should return null and call the settings.base(en)
    expect(wrapper.contains(<span>loading</span>)).toBe(true);
    expect(wrapper.contains(<div>loading</div>)).toBe(true);
    expect(translations.base).toHaveBeenCalledTimes(2);

    await nextTick();

    // When the promise is resolved, the component should be updated
    expect(wrapper.contains(<span>bar-en</span>)).toBe(true);
    expect(wrapper.contains(<div>baz-en</div>)).toBe(true);
    expect(translations.base).toHaveBeenCalledTimes(2);

    language.dispatch("de");

    // When switched back to de, everything should be visible instantly without any new loading
    expect(wrapper.contains(<span>bar-de</span>)).toBe(true);
    expect(wrapper.contains(<div>baz-de</div>)).toBe(true);
    expect(translations.base).toHaveBeenCalledTimes(2);
  });

  describe("fallback language", () => {
    it("successful fallback", async () => {
      const translations = {
        base: jest.fn((language: string) =>
          language === "en"
            ? Promise.resolve({
                foo: {
                  bar: `bar-${language}`,
                },
              })
            : Promise.reject()
        ),
      };
      const i18n = i18nFactory({
        fallbackLanguage: "en",
        translations,
      });

      const language = store("de");

      const MainComponent = component("MainComponent", () => (
        <language.Observer>
          {(languageState) => (
            <i18n.Provider language={languageState}>
              <i18n.Consumer>
                {({ base }) => <span>{base()?.foo.bar ?? "loading"}</span>}
              </i18n.Consumer>
            </i18n.Provider>
          )}
        </language.Observer>
      ));

      const wrapper = mount(<MainComponent />);

      // When initially base() is called, the function should return null and call the settings.base(de)
      expect(wrapper.contains(<span>loading</span>)).toBe(true);
      expect(translations.base).toHaveBeenCalledTimes(1);

      await nextTick();

      expect(wrapper.contains(<span>loading</span>)).toBe(true);
      expect(translations.base).toHaveBeenCalledTimes(2);

      await nextTick();

      expect(wrapper.contains(<span>bar-en</span>)).toBe(true);
      expect(translations.base).toHaveBeenCalledTimes(2);

      language.dispatch("en");

      expect(wrapper.contains(<span>bar-en</span>)).toBe(true);
      expect(translations.base).toHaveBeenCalledTimes(2);
    });

    it("failing fallback", async () => {
      const translations = {
        base: jest.fn(
          (_language: string): Promise<{ foo: { bar: string } }> =>
            Promise.reject()
        ),
      };
      const i18n = i18nFactory({
        fallbackLanguage: "en",
        translations,
      });

      const language = store("de");

      const MainComponent = component("MainComponent", () => (
        <language.Observer>
          {(languageState) => (
            <i18n.Provider language={languageState}>
              <Try catch={() => <div>error</div>}>
                {() => (
                  <i18n.Consumer>
                    {({ base }) => <span>{base()?.foo.bar ?? "loading"}</span>}
                  </i18n.Consumer>
                )}
              </Try>
            </i18n.Provider>
          )}
        </language.Observer>
      ));

      const wrapper = mount(<MainComponent />);

      // When initially base() is called, the function should return null and call the settings.base(de)
      expect(wrapper.contains(<span>loading</span>)).toBe(true);
      expect(translations.base).toHaveBeenCalledTimes(1);

      await nextTick();

      expect(wrapper.contains(<span>loading</span>)).toBe(true);
      expect(translations.base).toHaveBeenCalledTimes(2);

      await nextTick();

      expect(wrapper.contains(<div>error</div>)).toBe(true);
      expect(translations.base).toHaveBeenCalledTimes(2);
    });
  });

  describe("parralell", () => {
    it("seperate providers should load at the same time", async () => {
      const translations = {
        base: jest.fn(
          (_language: string): Promise<{ foo: { bar: string } }> =>
            Promise.resolve({
              foo: {
                bar: "baz",
              },
            })
        ),
      };

      const i18n = i18nFactory({
        fallbackLanguage: "en",
        translations,
      });

      const MainComponent = component("MainComponent", () => (
        <>
          <i18n.Provider language="en">
            <i18n.Consumer>
              {({ base }) => <div>{base()?.foo.bar ?? "loading"}</div>}
            </i18n.Consumer>
          </i18n.Provider>

          <i18n.Provider language="en">
            <i18n.Consumer>
              {({ base }) => <span>{base()?.foo.bar ?? "loading"}</span>}
            </i18n.Consumer>
          </i18n.Provider>
        </>
      ));

      const wrapper = mount(<MainComponent />);

      expect(wrapper.contains(<div>loading</div>)).toBe(true);
      expect(wrapper.contains(<span>loading</span>)).toBe(true);
      // expect(translations.base).toHaveBeenCalledTimes(2);

      await nextTick();

      expect(wrapper.contains(<div>baz</div>)).toBe(true);
      expect(wrapper.contains(<span>baz</span>)).toBe(true);
      expect(translations.base).toHaveBeenCalledTimes(2);
    });
  });
});
