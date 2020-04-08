import plusnew, { component } from "@plusnew/core";
import enzymeAdapterPlusnew, { mount } from "@plusnew/enzyme-adapter";
import { configure } from "enzyme";
import i18nFactory from "./index";

configure({ adapter: new enzymeAdapterPlusnew() });

describe("test dragFactory", () => {
  it("dragState is shown correctly", () => {
    const translations = {
      cd: jest.fn((language: string) =>
        Promise.resolve({
          foo: {
            bar: `foobar-${language}`,
          },
        })
      ),
    };
    const i18n = i18nFactory({
      translations,
    });

    const MainComponent = component("MainComponent", () => (
      <>
        <i18n.Provider language="de">
          <i18n.Consumer>
            {({ cd }) => <span>{cd()?.foo.bar}</span>}
          </i18n.Consumer>
        </i18n.Provider>
      </>
    ));

    const wrapper = mount(<MainComponent />);

    expect(wrapper.contains(<span>foobar-de</span>)).toBe(true);
  });
});
