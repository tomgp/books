const { readFileSync, writeFileSync } = require('fs');
const { csvParse } = require('d3-dsv');
const { render } = require('nunjucks');

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
    return year;
}).filter(d=>d.key!='0')

writeFileSync(
    './index.html', 
    render('./templates/index.html.nj', {
        years,
        ratingSymbols: [`${starMarkup}${starMarkup}`,`${starMarkup}`,`${tearMarkup}`,`${tearMarkup}${tearMarkup}`],
        monthName: [null,'January','February','March','April','May','June','July','August','September','October','November','December'],
        title: 'Books'
    })
);

//the end
