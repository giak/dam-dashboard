import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import TrendIndicator from '../TrendIndicator.vue';

describe('TrendIndicator', () => {
  it('renders correctly with upward trend', () => {
    const wrapper = mount(TrendIndicator, {
      props: { 
        currentValue: 10,
        previousValue: 5,
        upColor: 'text-green-500',
        downColor: 'text-red-500',
        stableColor: 'text-gray-500'
      }
    });
    expect(wrapper.find('i').classes()).toContain('pi-arrow-up');
    expect(wrapper.find('i').classes()).toContain('text-green-500');
  });

  it('renders correctly with downward trend', () => {
    const wrapper = mount(TrendIndicator, {
      props: { 
        currentValue: 5,
        previousValue: 10,
        upColor: 'text-green-500',
        downColor: 'text-red-500',
        stableColor: 'text-gray-500'
      }
    });
    expect(wrapper.find('i').classes()).toContain('pi-arrow-down');
    expect(wrapper.find('i').classes()).toContain('text-red-500');
  });

  it('renders correctly with stable trend', () => {
    const wrapper = mount(TrendIndicator, {
      props: { 
        currentValue: 10,
        previousValue: 10,
        upColor: 'text-green-500',
        downColor: 'text-red-500',
        stableColor: 'text-gray-500'
      }
    });
    expect(wrapper.find('i').classes()).toContain('pi-minus');
    expect(wrapper.find('i').classes()).toContain('text-gray-500');
  });

  it('renders correctly with null previous value', () => {
    const wrapper = mount(TrendIndicator, {
      props: { 
        currentValue: 10,
        previousValue: null,
        upColor: 'text-green-500',
        downColor: 'text-red-500',
        stableColor: 'text-gray-500'
      }
    });
    expect(wrapper.find('i').classes()).toContain('pi-minus');
    expect(wrapper.find('i').classes()).toContain('text-gray-500');
  });
});