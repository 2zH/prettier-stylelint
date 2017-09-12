/* eslint-disable import/unambiguous */

const fs = require('fs');
const path = require('path');
const prettier = require('prettier');
const tempWrite = require('temp-write');
const stylelint = require('stylelint');
const cosmiconfig = require('cosmiconfig');

const explorer = cosmiconfig('stylelint');

/**
 * Resolve Config for the given file
 *
 * @export
 * @param {string} file - filepath
 * @param {Object} options - options
 * @returns {Promise} -
 */
function resolveConfig(file, options = {}) {
    const resolve = resolveConfig.resolve;

    if (options.stylelintConfig) {
        return Promise.resolve(resolve(options.stylelintConfig));
    }

    return explorer.load(file).then(({ config }) => resolve(config));
}

resolveConfig.resolve = (stylelintConfig) => {
    const prettierConfig = {};
    const { rules } = stylelintConfig;

    if (rules['string-quotes']) {
        const quotes = Array.isArray(rules['string-quotes']) ?
            rules['string-quotes'][0] :
            rules['string-quotes'];

        if (quotes === 'single') {
            prettierConfig.singleQuote = true;
        }
    }

    if (rules.indentation) {
        const indentation = Array.isArray(rules.indentation) ?
            rules.indentation[0] :
            rules.indentation;

        if (indentation === 'tab') {
            prettierConfig.useTabs = true;
            prettierConfig.tabWidth = 2;
        } else {
            prettierConfig.useTabs = false;
            prettierConfig.tabWidth = indentation;
        }
    }
    prettierConfig.parser = 'postcss';

    return [prettierConfig, stylelintConfig];
};

function stylelinter(originalPath, filepath, config) {
    return stylelint
        .lint({
            files: filepath,
            config: config,
            fix: true,
            formatter: 'string'
        })
        .then(({ errored, output }) => {
            if (errored) {
                console.error(
                    'Stylelint errors: ' +
                        path.relative(process.cwd(), originalPath),
                    output
                );
            }
            const source = fs.readFileSync(filepath, 'utf8');

            return source;
        });
}

function format(options) {
    const { filePath, text, stylelintConfig } = options;

    if (!filePath && !stylelintConfig) {
        throw new Error('Either provide file path or stylelint config!');
    }

    return resolveConfig(
        filePath,
        options
    ).then(([prettierConfig, stylelintConfig]) => {
        const tempPath = tempWrite.sync(
            prettier.format(text, prettierConfig),
            'fix-stylelint' + path.extname(filePath)
        );

        return stylelinter(filePath, tempPath, stylelintConfig);
    });
}

exports.format = format;
exports.resolveConfig = resolveConfig;
