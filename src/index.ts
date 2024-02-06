import { Plugin, ViteDevServer } from 'vite'
import path from 'node:path'
import { generateSprite } from './sprite';
import { generateTypes } from './types';

type SvgSpritePluginOptions = {
	iconsDir: string
	generateDts?: boolean
}

const svgSprite = async ({
    iconsDir,
    generateDts = false
}: SvgSpritePluginOptions): Promise<Plugin> => {
	const virtualModuleId = 'virtual:svg-sprite'
	const resolvedVirtualModuleId = '\0' + virtualModuleId
	let devServer: ViteDevServer
	let outputCache: {
		result: any
		data: any
	}

	const generateAndUpdateCache = async () => {
		outputCache = await generateSprite(iconsDir)

		if (generateDts) {
			const shapeIds = outputCache.data.symbol.shapes.map((shape: any) => `'${shape.name}'`)
			await generateTypes(shapeIds)
		}
	}

	return {
		name: 'svg-sprite-plugin',
		async buildStart() {
			await generateAndUpdateCache()
		},
		async watchChange(id) {
			const relativePath = path.relative(iconsDir, id)

			if (relativePath.startsWith('..') || relativePath.includes(path.sep) || path.isAbsolute(relativePath)) {
				return
			}

			await generateAndUpdateCache()

            const module = devServer.moduleGraph.getModuleById(resolvedVirtualModuleId)

			if (module) await devServer.reloadModule(module)
		},
		resolveId(id) {
			if (id.startsWith(virtualModuleId)) {
				return '\0' + id
			}
		},
		load(id) {
			if (id === resolvedVirtualModuleId) {
				const shapeIds = outputCache.data.symbol.shapes.map((shape: any) => `'${shape.name}'`)

				if (this.meta.watchMode) {
					return /* js */ `
						export const icons = [${shapeIds.join(', ')}]
						export default '/@svg-sprite'
					`
				}

				const referenceId = this.emitFile({
					type: 'asset',
					name: 'icons.svg',
					source: outputCache.result.symbol.sprite.contents.toString(),
					needsCodeReference: true,
				})

				return /* js */ `
				    export const icons = [${shapeIds.join(', ')}]
				    export default import.meta.ROLLUP_FILE_URL_${referenceId}
				`
			}
		},
		configureServer(server) {
			devServer = server

			server.middlewares.use(async (req, res, next) => {
				let spritePath = `${server.config.base.replace(/\/$/, '')}/@svg-sprite`

				if (req.url === spritePath) {
					res.setHeader('Content-Type', 'image/svg+xml')

					return res.end(outputCache.result.symbol.sprite.contents)
				}

				next()
			})
		},
	}
}

export default svgSprite