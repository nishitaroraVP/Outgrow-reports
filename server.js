const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 8000;
const fs = require('fs');
const path = require('path');
const htmlPdf = require('html-pdf');

app.listen(PORT, () => {
    console.log("server started on " + PORT);
})
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb' }));

app.get('/', (req, res) => {
    res.write(`<h3>Welcom to highcharts generator</h3>`);
    res.end();
})
app.post('/reports',async(req,res)=>{
        let options={};
        try {
            let {content,calc,smtp} = req.body;
            content = content.replace(
                /<a[^>]+class="tag_delete"[^>]*>.*?<\/a>/gi,
                ""
            );
            content = `<div class='froalaPdfCustomDiv'>` + content + `</div>`;
            let tableStyling = `<style>.froalaPdfCustomDiv { font-family: montserratlight !important; }table td, table th { border: 1px solid #ddd; }</style>`;
            content = tableStyling + content;

            //pdf conversion
                options = {
                    border: {
                        top: "10mm",
                        right: "10mm",
                        bottom: "10mm",
                        left: "10mm",
                    },
                   
                };
                options["format"] = "A4";
            options["orientation"] = "portrait";

            let pdfPath = `${__dirname}/reports`;
            let attachments = [];

            console.log("............Pdf Create......")
            let pro = new Promise((resolve, reject) => {
                htmlPdf
                    .create(content, options)
                    .toFile(`${pdfPath}/${calc.name}.pdf`, async function (err, res) {
                        if (err) return console.log(err);
                        if (res) {
                            let mailD = new Promise((resolve, reject) => {
                                fs.readFile(
                                    `${pdfPath}/${calc.name}.pdf`,
                                    function (err, data) {
                                        if (data) {
                                            var base64data = smtp
                                                ? new Buffer(data)
                                                : new Buffer(data).toString("base64");

                                            attachments.push({
                                                filename: `${calc.name}.pdf`,
                                                content: base64data,
                                                type: "application/pdf",
                                            });
                                            if (!smtp) {
                                                attachments[0]["disposition"] = "attachment";
                                                attachments[0]["contentId"] = "myId";
                                            }
                                            resolve(data);
                                        }
                                    }
                                );
                            });
                            resolve(mailD);
                        }
                    });
            });
            let resProm = await Promise.all([pro]);
            if (resProm) {
                // console.log('Attachments', attachments);
                return res.json({ attach: attachments[0] });
            }
        } catch (err) {
            return err;
        } finally {
            let removeDir = `${__dirname}/../../pdf`;
            fs.readdir(removeDir, (err, files) => {
                if (err) return err;
                for (const file of files) {
                    fs.unlink(path.join(removeDir, file), (err) => {
                        if (err) return err;
                    });
                }
            });
        }
    }

)









