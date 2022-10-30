const { readFileSync, writeFileSync } = require('fs');
const { csvParse } = require('d3-dsv');
const { render } = require('nunjucks');
const { max } = require('d3-array');
const { scaleLinear } = require('d3-scale');

const starMarkup = readFileSync('./templates/star.svg');
const tearMarkup = readFileSync('./templates/tear.svg');

const splitBy = (array, splitter) => {
    const subarrays = {};
    array.forEach(d => {
        if( !subarrays[splitter(d)] ){
            subarrays[splitter(d)] = {key:splitter(d), data:[]};
        }
        subarrays[splitter(d)].data.push(d);
    });
    return  Object.entries(subarrays).sort((a,b)=>(a[0]-b[0])).map(d=>(d[1]));;
}

//get the data 
const ratingMeanings = [
    'Steer clear!',
    'I guess you might get something out if this is you\'re a fan of this kind of thing',
    'Fine',
    'Recomended if you like this kind of thing',
    'Recomended without reservation'
];

const decorateRow = (row) => {
    if(!row.title){
        return null;
    }
    const dateElements = row.date.split('-');
    row.readMonth = Number(dateElements[1]);
    row.readYear = Number(dateElements[0]);
    row.ratingNumber = { '--':1, '-':2, '':3, '+':4, '++':5 }[row.rating];
    row.ratingEmoji = { '--':`${tearMarkup}${tearMarkup}`, '-':`${tearMarkup}`, '':'', '+':`${starMarkup}`, '++':`${starMarkup}${starMarkup}` }[row.rating];
    row.pages = Number(row.pages);
    row.authors = row.authors.split(',').map(d=>d.trim()).join(', ');
    row['non-fiction'] = (row['non-fiction']!='');
    row['comic'] = (row['comic']!='');
    return row;
}

const books = csvParse( readFileSync('reading-list.csv','utf-8'), decorateRow )
    .filter(d=>(d.data != ''));

const years = splitBy(books, (d) => d.readYear);

const structuredData = years.map(year=>{
    year.months = splitBy(year.data, (d) => d.readMonth);
    year.count = year.data.length;
    year.pageCount = year.data.reduce((sum,current)=>{
        return sum + Number(current.pages);
    }, 0)
    year.formattedPageCount = year.pageCount.toLocaleString();
    return year;
}).filter(d=>d.key!='0');

const maxPages = max(years.map(d=>d.pageCount))+5000;

const height = 350;
const margin = {top:25, left:0, bottom:25, right:0};
const width = 800;
const plotHeight = height - (margin.top + margin.bottom);
const plotWidth = width - (margin.left + margin.right);

const pageScale = scaleLinear()
    .domain([0, maxPages])
    .range([0, plotHeight]);

const readDateStacks = structuredData.map(year=>{
    return year.data.reduce((acc, current)=>{
        acc.stack.push(current);
        current.height = Math.ceil(Math.max(pageScale(current.pages), 2));
        acc.stackHeight += (current.height+0.5); // +1 to allow for 1px border on each book
        current.y = plotHeight - acc.stackHeight;
        return acc;
    },{stackHeight:0, stack:[], year:year.key});
});

const maxYears = readDateStacks.length;


const yearScale = scaleLinear()
    .domain([0, maxYears])
    .range([0, plotWidth]);

const jitter = 0.1;
readDateStacks.reverse().forEach((year,i)=>{
    year.stack = year.stack.map((book)=>{
        book.x = yearScale(i + Math.random() * jitter);
        book.width = yearScale(0.6 + Math.random() * jitter);
        book.class = book.ratingNumber > 4 ? 1:2;
        return book;
    })
});

writeFileSync(
    './index.html', 
    render('./templates/index.html.nj', {
        years,
        ratingSymbols: [`${starMarkup}${starMarkup}`,`${starMarkup}`,`${tearMarkup}`,`${tearMarkup}${tearMarkup}`],
        monthName: [null,'January','February','March','April','May','June','July','August','September','October','November','December'],
        title: 'Books',
        plotHeight, width, height, margin,
        readDateStacks,
        updated: String(new Date()),
    })
);

//JSON feed 

const feed = {
    "version": "https://jsonfeed.org/version/1",
    "title": "Tom's books list",
    "home_page_url": "https://www.toffeemilkshake.co.uk/books",
    "feed_url": "https://www.toffeemilkshake.co.uk/books/feed.json",
    "author":{
        "name": "Tom Pearson",
        "url": "https://www.toffeemilkshake.co.uk"
    },
    "items": books
        .filter(book => book.date)
        .map((book, i)=>{
            return {
                "date_published": new Date(book.date),
                "id": `${i}`,
                "content_texttitle": `${book.title} by ${book.authors.split(',').join(', ')} (${book.published})`,
                "url": "https://www.toffeemilkshake.co.uk/books"
            }
        })
        .reverse()
}

writeFileSync('./feed.json', JSON.stringify(feed) );


//the end
