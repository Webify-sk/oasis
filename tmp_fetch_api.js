const http = require('http');
const fs = require('fs');

http.get('http://127.0.0.1:3000/api/debug?employeeId=1a1b7d3c-6383-4420-bcd5-4bf85c2ae6fd&serviceId=46aeed62-7d15-4cca-88c3-e563eca46e1b&date=2026-03-19', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        fs.writeFileSync('out2.json', JSON.stringify(JSON.parse(data), null, 2));
        console.log('Done writing out2.json');
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
