/* eslint-disable perfectionist/sort-objects -- keep the card in reading order */
// Edit this file to make the card yours. `curl <your domain>` is added under the
// logo automatically. Colors: black, red, green, yellow, blue, magenta, cyan, white.
import { defineCard } from './src/card.js'

export default defineCard({
	name: 'Xat',
	title: 'Design Engineer',
	// ASCII art, one string per line. Generate one with `figlet` or leave it out.
	logo: [
		'__   __',
		'\\ \\ / /',
		' \\ V / ',
		' / . \\ ',
		'/_/ \\_\\',
	],
	links: [
		{ label: 'Site', value: 'https://xat.sh' },
		{ label: 'GitHub', value: 'https://github.com/withxat' },
		{ label: 'X', value: 'https://x.com/withxat' },
		{ label: 'Email', value: 'i@xat.sh' },
	],
	motto: 'Code with Love, Explore the World.',
	colors: {
		logo: ['cyan', 'cyan', 'blue', 'magenta', 'magenta'],
		label: 'green',
		command: 'yellow',
	},
})
