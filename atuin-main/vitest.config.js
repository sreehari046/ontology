import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: './vitest.setup.js',
        include: ['test/**/*.spec.js'],
        globals: true
    },
    plugins: [
        {
            name: 'sparql-text-loader',
            transform(code, id) {
                if (id.endsWith('.sparql')) {
                    // Return the actual file content as a default export
                    return `export default ${JSON.stringify(code)};`
                }
            }
        }
    ]
})
