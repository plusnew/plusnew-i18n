import plusnew, { component, store } from "@plusnew/core";
import enzymeAdapterPlusnew, { mount } from "@plusnew/enzyme-adapter";
import { configure } from "enzyme";
import i18nFactory from "./index";

configure({ adapter: new enzymeAdapterPlusnew() });

function nextTick() {
  return new Promise((resolve) => resolve());
}

describe("test dragFactory", () => {
  it("dragState is shown correctly", async () => {
    const translations = {
      cd: jest.fn((language: string) =>
        Promise.resolve({
          foo: {
            bar: `bar-${language}`,
            baz: `baz-${language}`,
          },
        })
      ),
    };
    const i18n = i18nFactory({
      translations,
    });

    const language = store("de");

    const MainComponent = component("MainComponent", () => (
      <language.Observer>
        {(languageState) => (
          <i18n.Provider language={languageState}>
            <i18n.Consumer>
              {({ cd }) => <span>{cd()?.foo.bar ?? "loading"}</span>}
            </i18n.Consumer>
            <i18n.Consumer>
              {({ cd }) => <div>{cd()?.foo.baz ?? "loading"}</div>}
            </i18n.Consumer>
          </i18n.Provider>
        )}
      </language.Observer>
    ));

    const wrapper = mount(<MainComponent />);

    // When initially cd() is called, the function should return null and call the settings.cd(de)
    expect(wrapper.contains(<span>loading</span>)).toBe(true);
    expect(wrapper.contains(<div>loading</div>)).toBe(true);
    expect(translations.cd).toHaveBeenCalledTimes(1);

    await nextTick();

    // When the promise is resolved, the component should be updated
    expect(wrapper.contains(<span>bar-de</span>)).toBe(true);
    expect(wrapper.contains(<div>baz-de</div>)).toBe(true);
    expect(translations.cd).toHaveBeenCalledTimes(1);

    language.dispatch("en");

    // When language got changed, the function should return null and call the settings.cd(en)
    expect(wrapper.contains(<span>loading</span>)).toBe(true);
    expect(wrapper.contains(<div>loading</div>)).toBe(true);
    expect(translations.cd).toHaveBeenCalledTimes(2);

    await nextTick();

    // When the promise is resolved, the component should be updated
    expect(wrapper.contains(<span>bar-en</span>)).toBe(true);
    expect(wrapper.contains(<div>baz-en</div>)).toBe(true);
    expect(translations.cd).toHaveBeenCalledTimes(2);

    language.dispatch("de");

    // When switched back to de, everything should be visible instantly without any new loading
    expect(wrapper.contains(<span>bar-de</span>)).toBe(true);
    expect(wrapper.contains(<div>baz-de</div>)).toBe(true);
    expect(translations.cd).toHaveBeenCalledTimes(2);
  });
});
