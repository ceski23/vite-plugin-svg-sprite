import fs from 'node:fs/promises'

export const generateTypes = async (shapeIds: Array<string>) => {
	await fs.writeFile(
		'./svgSpritePlugin.d.ts',
		/* ts */ `
// Auto-generated file, DO NOT EDIT
declare module 'virtual:svg-sprite' {
	export type SvgSpriteIconName = ${shapeIds.join(' | ')}
	export const icons: Array<SvgSpriteIconName>
	const sprite: string
	export default sprite
}
	`.trim(),
		'utf-8',
	)
}