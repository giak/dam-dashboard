import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import WeatherDataDisplay from '../WeatherDataDisplay.vue';

describe('WeatherDataDisplay', () => {
  it('renders properly', () => {
    const wrapper = mount(WeatherDataDisplay, {
      props: {
        label: 'Temperature',
        value: 25.5,
        unit: '°C',
        color: 'blue',
        precision: 1
      }
    });

    expect(wrapper.text()).toContain('Temperature');
    expect(wrapper.text()).toContain('25.5');
    expect(wrapper.text()).toContain('°C');
    expect(wrapper.find('.border-blue-500').exists()).toBe(true);
  });

  it('formats value correctly', () => {
    const wrapper = mount(WeatherDataDisplay, {
      props: {
        label: 'Precipitation',
        value: 10.123,
        unit: 'mm',
        color: 'green',
        precision: 2
      }
    });

    expect(wrapper.text()).toContain('10.12');
  });

  it('updates when value changes', async () => {
    const wrapper = mount(WeatherDataDisplay, {
      props: {
        label: 'Wind Speed',
        value: 5,
        unit: 'km/h',
        color: 'red',
        precision: 0
      }
    });

    expect(wrapper.text()).toContain('5');

    await wrapper.setProps({ value: 10 });

    expect(wrapper.text()).toContain('10');
  });
});
