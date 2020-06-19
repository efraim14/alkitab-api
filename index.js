const express = require('express');
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;
const axios = require('axios');
const cheerio = require('cheerio');

let chapterMap = {};

const getChapters = (version, book, chapter, verseNumber) => {
  const items = chapterMap[`${version}:${book}:${chapter}`];
  if (items && items.length) {
    let result = items;
    if (verseNumber) {
      result = items.filter(item => item.verse === verseNumber);
    }
    return Promise.resolve({
      verses: result,
      book,
      chapter,
      version,
    });
  } else {
    return axios.get(`http://alkitab.mobi/${version}/${book}/${chapter}`).then(({ data }) => {
      let $ = cheerio.load(data);
      let items = [];
      let lastVerse = 0;
      $('p').filter((i, el) => {
        let data = $(el);
        let content = data
          .find('[data-begin]')
          .first()
          .text();
        let title = data
          .find('.paragraphtitle')
          .first()
          .text();
        let verse = data
          .find('.reftext')
          .children()
          .first()
          .text();
        let order = i;
        let type = null;
        let item = {};

        if (!verse) {
          verse = 0;
        } else {
          verse = parseInt(verse, 10);
        }

        if (!title && !content) {
          data.find('.reftext').remove();
          content = data.text();
        }

        if (title) {
          type = 'title';
          content = title;
          verse = lastVerse + 1;
        } else if (content) {
          type = 'content';
          lastVerse = verse;
        }

        if (data.attr('hidden') === 'hidden' || data.hasClass('loading') || data.hasClass('error')) {
          type = null;
        }

        if (type) {
          item = {
            content,
            type,
            verse,
            book,
            chapter,
            version,
            order,
          };
          items.push(item);
        }
        return item;
      });
      chapterMap[`${version}:${book}:${chapter}`] = items;
      let result = items;
      if (verseNumber) {
        result = items.filter(item => item.verse === verseNumber);
      }
      return {
        verses: result,
        book,
        chapter,
        version,
      };
    });
  }
};

const typeDefs = `
	type Verse {
		content: String
		book: String
		version: String
		chapter: Int
		verse: Int
		order: Int
		type: String
	} 

	type Chapter {
		verses: [Verse]
		chapter: Int
		book: String
		version: String
	}

  enum Version {
    av
    net
    nkjv
    amp
    esv
    niv
    bbe
    tb
    jawa
    sunda
    toba
    makasar
    bali
    lampung
    simalungun
    nias
    aceh
    mentawai
    mamasa
    berik
    manggarai
    sabu
    kupang
    abun
    meyah
    uma
    yawa
    gorontalo
    barantak
    bambam
    mongondow
    aralle
    napu
    sangir
    taa
    rote
    galela
    yali
    tabaru
    karo
  }
	
  type Query {
    passages(version: Version, book: String, chapter: Int, verse: Int): Chapter
  }
`;

// Source: Alkitab Mobile SABDA http://alkitab.mobi/

const app = express();

app.use(bodyParser.json());

app.route('/:translation/:book/:chapter').get(function(req, res) {
  getChapters(
    req.params.translation,
    req.params.book,
    req.params.chapter
    ).then((result) => {
    res.json(result);
  });
});

app.listen({ port }, () => {
  console.log(`🚀 Server ready at port ${port}`);
});