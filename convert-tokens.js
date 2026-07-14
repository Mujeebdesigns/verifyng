const fs = require('fs');
const path = require('path');

const TOKENS_DIR = path.join(__dirname, 'tokens');
const OUTPUT_FILE = path.join(__dirname, 'tokens', 'tokens.css');

function toKebabCase(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function formatValue(token, name) {
    const { type, value } = token;

    if (type === 'color') {
        return [{ name, value: value }];
    }

    if (type === 'custom-shadow') {
        const { shadowType, offsetX, offsetY, radius, spread, color } = value;
        const insetStr = shadowType === 'innerShadow' ? 'inset ' : '';
        const shadowValue = `${insetStr}${offsetX}px ${offsetY}px ${radius}px ${spread}px ${color}`;
        return [{ name, value: shadowValue }];
    }

    if (type === 'custom-grid') {
        const vars = [];
        if (value.pattern) vars.push({ name: `${name}-pattern`, value: value.pattern });
        if (value.sectionSize !== undefined) vars.push({ name: `${name}-section-size`, value: `${value.sectionSize}px` });
        if (value.gutterSize !== undefined) vars.push({ name: `${name}-gutter-size`, value: `${value.gutterSize}px` });
        if (value.alignment) vars.push({ name: `${name}-alignment`, value: value.alignment });
        if (value.count !== undefined) vars.push({ name: `${name}-count`, value: value.count });
        if (value.offset !== undefined) vars.push({ name: `${name}-offset`, value: `${value.offset}px` });
        return vars;
    }

    if (type === 'custom-fontStyle') {
        const vars = [];
        const {
            fontSize,
            textDecoration,
            fontFamily,
            fontWeight,
            fontStyle,
            fontStretch,
            letterSpacing,
            lineHeight,
            paragraphIndent,
            paragraphSpacing,
            textCase
        } = value;

        const formattedFontFamily = fontFamily && fontFamily.includes(' ') ? `'${fontFamily}'` : fontFamily;

        if (fontSize !== undefined) vars.push({ name: `${name}-font-size`, value: `${fontSize}px` });
        if (textDecoration) vars.push({ name: `${name}-text-decoration`, value: textDecoration });
        if (fontFamily) vars.push({ name: `${name}-font-family`, value: formattedFontFamily });
        if (fontWeight !== undefined) vars.push({ name: `${name}-font-weight`, value: fontWeight });
        if (fontStyle) vars.push({ name: `${name}-font-style`, value: fontStyle });
        if (fontStretch) vars.push({ name: `${name}-font-stretch`, value: fontStretch });
        if (letterSpacing !== undefined) vars.push({ name: `${name}-letter-spacing`, value: `${letterSpacing}px` });
        if (lineHeight !== undefined) vars.push({ name: `${name}-line-height`, value: `${lineHeight}px` });
        if (paragraphIndent !== undefined) vars.push({ name: `${name}-paragraph-indent`, value: `${paragraphIndent}px` });
        if (paragraphSpacing !== undefined) vars.push({ name: `${name}-paragraph-spacing`, value: `${paragraphSpacing}px` });
        if (textCase) {
            vars.push({ name: `${name}-text-case`, value: textCase });
            let textTransform = 'none';
            if (textCase === 'uppercase') textTransform = 'uppercase';
            else if (textCase === 'lowercase') textTransform = 'lowercase';
            else if (textCase === 'capitalize') textTransform = 'capitalize';
            vars.push({ name: `${name}-text-transform`, value: textTransform });
        }

        // Add shorthand font variable
        if (fontSize !== undefined && lineHeight !== undefined && fontFamily) {
            const style = fontStyle || 'normal';
            const weight = fontWeight || 400;
            const stretch = fontStretch || 'normal';
            const shorthand = `${style} normal ${weight} ${stretch} ${fontSize}px/${lineHeight}px ${formattedFontFamily}`;
            vars.push({ name: `${name}-font`, value: shorthand });
        }

        return vars;
    }

    if (type === 'dimension') {
        const val = typeof value === 'number' ? `${value}px` : value;
        return [{ name, value: val }];
    }

    if (type === 'number') {
        return [{ name, value: value }];
    }

    if (type === 'string') {
        const val = name.endsWith('font-family') && value.includes(' ') ? `'${value}'` : value;
        return [{ name, value: val }];
    }

    // Default fallback
    return [{ name, value: String(value) }];
}

function traverse(obj, path, callback) {
    if (!obj || typeof obj !== 'object') return;

    if (typeof obj.type === 'string') {
        callback(obj, path);
        return;
    }

    for (const key in obj) {
        if (key === 'description' || key === 'extensions') continue;
        traverse(obj[key], [...path, key], callback);
    }
}

function main() {
    if (!fs.existsSync(TOKENS_DIR)) {
        console.error(`Error: Tokens directory not found at ${TOKENS_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(TOKENS_DIR).filter(file => file.endsWith('.json'));
    const cssVariables = [];

    files.forEach(file => {
        const filePath = path.join(TOKENS_DIR, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        traverse(content, [], (token, tokenPath) => {
            // Skip the duplicate "typography" branch to avoid duplicate variables
            if (tokenPath[0] === 'typography') {
                return;
            }

            const baseVarName = '--' + tokenPath.map(toKebabCase).join('-');
            const formatted = formatValue(token, baseVarName);
            cssVariables.push(...formatted);
        });
    });

    // Generate CSS content
    let cssContent = `/* Generated CSS Variables from Design Tokens */\n\n:root {\n`;
    cssVariables.forEach(v => {
        cssContent += `    ${v.name}: ${v.value};\n`;
    });
    cssContent += `}\n`;

    fs.writeFileSync(OUTPUT_FILE, cssContent, 'utf8');
    console.log(`Successfully converted all tokens to CSS variables! Saved to: ${OUTPUT_FILE}`);
}

main();
