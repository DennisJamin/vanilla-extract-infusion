import type { PatternResult, RecipeClassNames, RuntimeFn, VariantGroups, VariantSelection } from './types';
import { mapValues } from './utils';

const shouldApplyCompound = <Variants extends VariantGroups>(
  compoundCheck: VariantSelection<Variants>,
  selections: VariantSelection<Variants>,
  defaultVariants: VariantSelection<Variants>,
) => {
  for (const key of Object.keys(compoundCheck)) {
    if (compoundCheck[key] !== (selections[key] ?? defaultVariants[key])) {
      return false;
    }
  }

  return true;
};

export const createRuntimeFn = <Variants extends VariantGroups>(
  config: PatternResult<Variants>,
): RuntimeFn<Variants> => {
  const runtimeFn: RuntimeFn<Variants> = options => {
    let className = config.defaultClassName;

    const selections: VariantSelection<Variants> = {
      ...config.defaultVariants,
      ...options,
    };
    for (const variantName in selections) {
      const variantSelection = selections[variantName] ?? config.defaultVariants[variantName];

      if (variantSelection != null) {
        let selection = variantSelection;

        if (typeof selection === 'boolean') {
          // @ts-ignore vanilla-extract typing error
          selection = selection === true ? 'true' : 'false';
        }

        let selectionClassName;

        /**
         * Upgraded compared to the original implementation, added support for conditional variants
         */
        if (typeof selection === 'object') {
          selectionClassName = Object.keys(selection).reduce((accumulator, selectionKey) => {
            // @ts-ignore vanilla-extract typing error
            const conditionalSelection = `${selection[selectionKey]}${
              selectionKey !== 'initial' ? `-${selectionKey}` : ''
            }`;
            return (accumulator += ` ${config.variantClassNames[variantName][conditionalSelection]}`);
          }, '');
        } else {
          // @ts-ignore vanilla-extract typing error
          selectionClassName = config.variantClassNames[variantName][selection];
        }

        if (selectionClassName) {
          className += ' ' + selectionClassName;
        }
      }
    }

    for (const [compoundCheck, compoundClassName] of config.compoundVariants) {
      if (shouldApplyCompound(compoundCheck, selections, config.defaultVariants)) {
        className += ' ' + compoundClassName;
      }
    }

    return className;
  };

  runtimeFn.variants = () => Object.keys(config.variantClassNames);

  runtimeFn.classNames = {
    get base() {
      return config.defaultClassName.split(' ')[0];
    },

    get variants() {
      return mapValues(config.variantClassNames, classNames =>
        mapValues(classNames, className => className.split(' ')[0]),
      ) as RecipeClassNames<Variants>['variants'];
    },
  };

  return runtimeFn;
};
