# WWN Adobe InDesign Scripts

Various scripts used with Adobe InDesign at the [Western Wayne News](https://westernwaynenews.com) newspaper to aid in the layout and production of our print publication.

## Batch Export PDFs

Given a folder of InDesign files, where each file represents a page of the newspaper using the file naming scheme `WWN pg X [BW|COLOR].indd` (example, `WWN pg 8 BW.indd`), this script generates a variety of PDF files:

1. A folder in the issue directory called `PDFs`
2. A single page PDF file for each page file
3. A multi-page PDF file that combines all the pages into one

The single-page PDF files are named with the issue date the page belongs to and possibly the indication that it's a color page, e.g. `WWN_08_07_26_2023.pdf` or `WWN_12_07_26_2023_COLOR.pdf`. The issue date is based on the date of the next Wednesday in the future; Wednesday  is our weekly publishing schedule. These files use the "High Quality Print" export preset.

The multi-page PDF file uses the "Smallest File Size" export preset.

## Prevent Multiple Opens

When opening an InDesign file, checks for the existence of a lockfile and prevents opening if one is found.

Otherwise, creates a lockfile using the same filename but `.txt` as the extension, and populates it with the name of the InDesign user opening the file.

When the file is closed, deletes the lockfile.

More information about the [use cases and history in this blog post](https://tech.chrishardie.com/2022/locking-adobe-indesign-files-editing-shared-cloud/). Based on [indesign-prevent-multiple-opens](https://github.com/t3n/indesign-prevent-multiple-opens) by Max Schmidt and the folks at [t3n](https://t3n.de).

## Import Story Layers for Page

Given an open InDesign file representing a single newspaper page, named in the format `WWN pg 8.indd`, import the stories designated to appear on that page from an external API endpoint.

### Requirements

* The [JSON-in-js library](https://github.com/douglascrockford/JSON-js), included here as a git submodule
* An API endpoint that receives a page number and security key, and returns stories for that page

### Installation

Place the script and the JSON library in the `Scripts Panel` directory, done most easily by cloning this repository and running `git submodule update --init --recursive`.

Add a `wwn-env.js` file in the same directory that follows this format:

```php
const wwnEnv = {
	// Production
	apiKey: 'my-api-key-here',
	apiUrl: 'https://example.com/api/my-api-endpoint',
};
```

### Endpoint Specification

The API endpoint should be prepared to handle GET requests with query parameters `key` and `page`, e.g. `https://example.com/api/my-api-endpoint?key=my-key&page=2`.

For valid requests, it should return a JSON response with this structure:

```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "record_id_1",
      "headline": "My first headline",
      "subhead": null,
      "byline": "From staff reports",
      "body": "Lectus viverra cubilia.",
      "image_url": "https://placehold.co/600x400",
      "cutline": "My image caption 1 here"
    },
    {
      "id": "record_id_2",
      "headline": "A second story",
      "subhead": "You should really read this",
      "byline": "By David Carr",
      "body": "Lectus viverra cubilia.",
      "image_url": null,
      "cutline": null
    }]
}
```

## Importing

When the script is run, it will fetch the available stories and then create story layers in the pasteboard area of the page.

It will perform the following style conversions, assuming source content in Markdown:

* Bold items formatted as `**Text**` will have the "Body Bold" character style applied
* Italic items formatted as `_Text_` will have the "Body Italic" character style applied
* Bullet items beginning with `- ` e.g. `- My bullet point` will be converted to the character "n" followed by an en space, and receive the `Bullet 11 pt.`
* Contents of the `cutline` field will receive the "Photo credit" character style
* `\n` line breaks converted to `\r` breaks

If the script cannot retrieve stories or if the result count is 0, it will display a message.

## Changelog

### July 30, 2023

* Initial changelog entry

## License

For license information, see [LICENSE](LICENSE.md).

## Author

* Brian Pifer
* Chris Hardie

Some scripts were assembled from various examples and functions posted online, with the original source indicated where possible.
