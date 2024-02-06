import SVGSpriter from 'svg-sprite'
import fs from 'node:fs/promises'
import path from 'node:path'

export const generateSprite = async (srcDir: string) => {
	const spriter = new SVGSpriter({
		mode: {
			symbol: true,
		},
		svg: {
			xmlDeclaration: false,
			namespaceIDs: false,
			doctypeDeclaration: false,
		},
		shape: {
			transform: [
				{
					svgo: {
						// @ts-expect-error invalid types for svgo plugins
						plugins: [
							'preset-default',
							{
								name: 'convertColors',
								params: {
									currentColor: true,
								},
							},
							'removeXMLNS',
						],
					},
				},
			],
		},
	})

	const files = await fs.readdir(srcDir)
	const svgFiles = await Promise.all(
		files.filter(path => path.endsWith('.svg')).map(async file => {
			const absPath = path.resolve(srcDir, file)
			const content = await fs.readFile(absPath, 'utf-8')

			return [absPath, content]
		}),
	)

	svgFiles.forEach(([filePath, content]) => {
		if (content.length > 0) {
			spriter.add(filePath, null, content)
		}
	})

	return spriter.compileAsync()
}