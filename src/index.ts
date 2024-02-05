import { style, styleVariants } from '@vanilla-extract/css';
import { addRecipe } from '@vanilla-extract/css/recipe';

import { createRuntimeFn } from './createRuntimeFn';
import type { PatternOptions, PatternResult, RuntimeFn, VariantGroups, VariantSelection } from './types';
import { mapValues } from './utils';

export type { RecipeVariants, RuntimeFn } from './types';

export type VariantConditions = {
  [variantConditionName: string]: {
    type: '@media' | '@supports';
    query: string;
  };
};

type ConditionalRecipeOptions = {
  variantConditions?: VariantConditions;
};

/**
 * This utility will enrich the given recipe options with variants for each given variantCondition, which can
 *  be dynamically applied according to the given condition type and query.
 */
function enrichVariantsWithConditions<Variants extends VariantGroups>(
  options: PatternOptions<Variants> & ConditionalRecipeOptions,
): void {
  const { variantConditions, variants } = options;

  if (!variantConditions || !variants) return;

  for (const [conditionName, condition] of Object.entries(variantConditions)) {
    for (const [variantName, variantValues] of Object.entries(variants)) {
      for (const [variantValue, variantStyles] of Object.entries(variantValues)) {
        const variantValueWithCondition = `${variantValue}-${conditionName}`;

        variants[variantName][variantValueWithCondition] = {
          [condition.type]: {
            [condition.query]: variantStyles,
          },
        };
      }
    }
  }
}

/**
 * This is a modified version of the vanilla-extract recipe utility, which adds support for conditional variants.
 *
 * Originally, the recipe utility does not support variants that can be applied conditionally (e.g. based on a media
 * query). By using this utility over vanilla-extract's recipe utility, the given variants in the recipe options are
 * enriched with variants for each given variantCondition. Using the enrichVariantsWithConditions method above, and
 * running an alternative runtimeFunction, the conditional variants can be applied and the variant's original styles
 * are wrapped with the given condition type and query.
 *
 * @example:
 * const example = conditionalRecipe({
 *   variants: {
 *     spacing: {
 *       narrow: {
 *         padding-inline: '10px',
 *       },
 *       wide: {
 *         padding-inline: '20px',
 *       },
 *     }
 *   },
 *   variantConditions: {
 *     sm: {
 *       type: 'screen',
 *       query: '(min-width: 375px)',
 *     },
 *     md: {
 *       type: 'screen',
 *       query: '(min-width: 768px)',
 *     },
 *   },
 * });
 *
 * example({ spacing: { initial: 'narrow', md: 'wide' } });
 *
 * // Runtime generates the following (pseudo) css classes to be applied to the element:
 * 'example-spacing-initial-narrow example-spacing-md-wide'
 *
 * // The following styling will be available:
 * .example-spacing-initial-narrow: { padding-inline: 10px; }
 * @media screen and (min-width: 768px) {
 *  .example-spacing-md-wide: { padding-inline: 20px; }
 * }
 *
 * The original implementation can be found here:
 * https://github.com/vanilla-extract-css/vanilla-extract/blob/master/packages/recipes/src/index.ts
 */
export function conditionalRecipe<Variants extends VariantGroups>(
  options: PatternOptions<Variants> & ConditionalRecipeOptions,
  debugId?: string,
): RuntimeFn<Variants> {
  // Modification compared to the original implementation, added support for conditional variants
  enrichVariantsWithConditions(options);

  const { variants = {}, defaultVariants = {}, compoundVariants = [], base } = options;

  let defaultClassName;

  if (!base || typeof base === 'string') {
    const baseClassName = style({});
    defaultClassName = base ? `${baseClassName} ${base}` : baseClassName;
  } else {
    defaultClassName = style(base, debugId);
  }

  // @ts-ignore vanilla-extract typing error
  const variantClassNames: PatternResult<Variants>['variantClassNames'] = mapValues(
    variants,
    (variantGroup, variantGroupName) =>
      styleVariants(
        variantGroup,
        styleRule => (typeof styleRule === 'string' ? [styleRule] : styleRule),
        debugId ? `${debugId}_${variantGroupName}` : variantGroupName,
      ),
  );

  const compounds: Array<[VariantSelection<Variants>, string]> = [];

  for (const { style: theStyle, variants } of compoundVariants) {
    compounds.push([
      variants,
      typeof theStyle === 'string' ? theStyle : style(theStyle, `${debugId}_compound_${compounds.length}`),
    ]);
  }

  const config: PatternResult<Variants> = {
    defaultClassName,
    variantClassNames,
    defaultVariants,
    compoundVariants: compounds,
  };

  // Modification compared to the original implementation, added support for conditional variants
  return addRecipe(createRuntimeFn(config), {
    importPath: 'vanilla-extract-infusion/createRuntimeFn',
    importName: 'createRuntimeFn',
    // @ts-ignore vanilla-extract typing error
    args: [config],
  });
}
