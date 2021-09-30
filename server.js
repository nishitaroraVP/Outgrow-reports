const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 8000;
const fs = require('fs');
const path = require('path');
const htmlPdf = require('html-pdf');
const uuid = require('node-uuid');

app.listen(PORT, () => {
    console.log("server started on " + PORT);
})
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb' }));

app.get('/', (req, res) => {
    res.write(`<h3>Welcom to Outgrow Reports generator</h3>`);
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
            let removeDir = `${__dirname}/reports`;
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
app.post('/analytics/reports', async (req, res) => {

    try {


        let totalResults = req.body.totalResults;
        let todayfulldate = req.body.todayfulldate;
        let reportDataKeys = req.body.reportDataKeys;
        console.log('My Reports', totalResults);


        let proarray = [];
        let maildata = {};
        let smtpMailData = {};


        totalResults.map(async (resultdata) => {
            let html = '';
            let overview = '';
            let sortedRepoKeys = Object.keys(resultdata).reverse();
            let count = 0;
            let reportName = resultdata.report[0].report_name;
            reportDataKeys[reportName].map(async (reportname, index) => {
                if (reportname !== 'overview' && reportname !== 'report' && resultdata.report[0][reportname]) {
                    html += `
                <div class="main">
                <div class="table-outer" style='${ (count !== Object.keys(resultdata).length - 2) && count && ((count + 1) % 2 === 0) ? "page-break-after:always;" : ""}' >
                <div class="table-head" ><b>${resultdata.report[0][reportname].tablename.replace(/<.*?>/gmi, '')}</b></div>
                <div class="table-inner">
                ${(typeof (resultdata[reportname]) == "string" && resultdata[reportname]) ? resultdata[reportname] : `<p style='text-align:center'>Data Not Available</p>`}
                </div>
                </div>
                </div>
                `;
                    count++;

                } else if (reportname == 'overview') {
                    overview = ` <div class="overview-outer">
            <div class="overview-header">
            </div>
            <div class="overview-body">
                <div class="overview-row">
                 <div class="overview-col">
                     <h2>${resultdata[reportname].visitors} <p>Users Visited</p></h2>

                 </div>
                 <div class="overview-col">
                    <h2>${resultdata[reportname].calcStarts} <p>Users Started</p></h2>

                </div>
                <div class="overview-col">
                    <h2>${resultdata[reportname].completed} <p>Users Completed</p></h2>

                </div>
                <div class="overview-col">
                <h2>${resultdata[reportname].conversionRate}% <p>Conversion Rate</p></h2>

                </div>
                </div>
                <div class="overview-row">

                <div class="overview-col">
                <h2>${resultdata[reportname].conversions} <p>Conversions</p></h2>

                </div>
                <div class="overview-col">
                <h2>${resultdata[reportname].engagements}   <p>Engagements</p></h2>

                </div>
                </div>
            </div>
        </div> <br /> <br />`

                    html += `<div class="main" >
        <div class="table-outer" style='${ (count !== Object.keys(resultdata).length - 2) && count && ((count + 1) % 2 === 0) ? "page-break-after:always;" : ""}'>
        <div class="table-head" ><b>${resultdata.report[0][reportname].tablename}</b></div>
        <div class="table-inner overview">
        ${overview}
        </div>
        </div>
        </div>`
                    count++;
                }
            })
            let mainhtml = `<html>
        <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>Page Title</title>
        <style type="text/css">
        @import url("https://fonts.googleapis.com/css?family=Montserrat");
        body{
        font-family: 'Montserrat'; background:#fff;
        }

        .table-heading{ float:none; width:100%; font-size:12px ;  margin-bottom:10px;font-family:Montserrat; }
        .table-heading span{ font-size:12px ; }
        .table-heading h1 { font-size:16px ; float:left; margin-bottom:0;  }
        .table-heading h2 { font-size:14px ; float:left; margin-top:0px !important; margin-bottom:0px; }
        .table-heading h2 span{ font-size:12px ; }
        .main{float:none; display:block;  }
        .table-outer{float:none;  display:block; margin-top:50px; min-height:180px;width:550px; background: #fff;  margin-bottom:50px; box-shadow:1px 2px 26px 2px rgba(0,0,0,0.2);overflow:hidden;padding-bottom:20px; }
        .table-outer:nth-child{3}{ margin-top:40px; margin-bottom:40px; float:left;}
        .table-head{float:none;  display:block; width:530px; background:#e0e8ed; padding:10px ; font-size:14px; font-weight:bold; color:#62696d; text-align:left; }
        .table-inner{float:none;  display:block; width:530px; padding:10px;word-break:break-word;}
        .table-inner.overview h2{ font-size:20px;  float:left;margin-bottom:10px;width:125px; margin-top:0;}
        .table-inner.overview h2 p{ font-size:10px; float:left: width:100%;margin:0;color:#666; }
        table{ width:100% ; float:none; }
        table td{ font-size:11px; width:auto;  text-align:center; padding:5px ; }
        table th{ font-size:12px; width:auto; font-weight:700; text-align:center; padding:5px ;  }
        .main-heading{font-size:18px;float:left;width:100%;}
        .navbar-brand{float:right;width:30%; position:absolute; right:0px; top:30px; }
        .abc{float:left;width:70%;}

        .navbar-brand>span {
            float: left;
            font-size: 18px;
            color: #62696d !important;
            margin-top: 1px;
            line-height: initial;
            width:150px;
            height:40px; 
            max-height:40px; overflow:hidden;

        }
        .navbar-brand span img {
           float:left;
           overflow:hidden; width:100%;
        }
        .table-heading h1,.table-heading h2{ width:auto ; float:none;padding-right:190px;}
        .pqr{background-color:#a9a2de;width: 23px;height: 4px;margin:0 auto;}
        .des{text-align:left;}
        </style>

        </head>

        <body style="font-family:Montserrat; max-width:600px padding:30px; margin:0 ;  background:#f9fafc;">

        <div style="float:none; width:100%; padding:20px; ">
      <div class="table-heading main-heading"><h1 class="abc">${resultdata.report[0].report_name}<span class="navbar-brand">
      <img src="${resultdata.report[0].logo}" alt="logo" > <span><b></b></span></span></h1> </div>
      <div class="table-heading"><h2><b></b></h2></div>  
      <div class="table-heading"><h2><b>${resultdata.report[0].templateType} Name :</b> <span>${resultdata.report[0].url}</span></h2> </div>
        <div class="table-heading"><h2><b>Date Range :</b> <span>${(resultdata.report[0].series['start_date']).replace(/-/gmi, '/')} - ${(todayfulldate).replace(/-/gmi, '/')}</span></h2></div>
        ${html}
        </div>
        </body>
        </html>`

            mainhtml = mainhtml.replace(/\n/gmi, '');
            let filename
            let reportPath = `${__dirname}/analyze-reports`;


            let pro = new Promise((resolve, reject) => {
                let count = 1;
                let uuidRp = uuid.v1().replace(/-/g, '');
                htmlPdf.create(mainhtml).toFile(`${reportPath}/${resultdata.report[0].report_name}-${uuidRp}.pdf`, async function (err, res) {
                    if (err) return console.log(err);
                    if (res) {
                        console.log('pdf generated')


                        let mailD = new Promise((resolve, reject) => {
                            fs.readFile(`${reportPath}/${resultdata.report[0].report_name}-${uuidRp}.pdf`, function (err, data) {

                                var base64data = new Buffer.from(data).toString('base64')
                                if (!resultdata.report[0].smtp) {
                                    let mail = {
                                        attachments: [{
                                            filename: `${resultdata.report[0].report_name}-${uuidRp}.pdf`,
                                            content: base64data,
                                            type: 'application/pdf',
                                            disposition: 'attachment',
                                            contentId: 'myId'
                                        }],
                                        html: resultdata.report[0].series.message,
                                        subject: resultdata.report[0].series.subject,
                                        to: resultdata.report[0].series.reciever_emails,
                                        from: {
                                            email: resultdata.report[0].series.sender_email,
                                            name: resultdata.report[0].series.sender_name
                                        },
                                    }
                                    if (maildata[resultdata.report[0].series._id]) {
                                        maildata[resultdata.report[0].series._id].attachments.push(mail.attachments[0])
                                    } else {
                                        maildata[resultdata.report[0].series._id] = mail
                                    }
                                } else {

                                    let smtpData = {
                                        attachments: [{
                                            filename: `${resultdata.report[0].report_name}-${uuidRp}.pdf`,
                                            content: new Buffer.from(data).toString('base64'),
                                            type: 'application/pdf',
                                        }],
                                        html: resultdata.report[0].series.message,
                                        subject: resultdata.report[0].series.subject,
                                        to: {
                                            email: resultdata.report[0].series.reciever_emails,
                                        },
                                        company: resultdata.report[0].company_id
                                    }
                                    if (smtpMailData[resultdata.report[0].series._id]) {
                                        smtpMailData[resultdata.report[0].series._id].attachments.push(smtpData.attachments[0])
                                    } else {
                                        smtpMailData[resultdata.report[0].series._id] = smtpData
                                    }
                                }
                                resolve(data)
                            });
                        })
                        filename = resolve(mailD);
                    }
                });
            });
            proarray.push(pro)
        })
        let mailasync = await Promise.all(proarray);
        return res.json({ mailasync, maildata, smtpMailData })

    }
    catch (err) {
        return err;
    } finally {
        let removeDir = `${__dirname}/analyze-reports`;
        fs.readdir(removeDir, (err, files) => {
            if (err) return err;
            for (const file of files) {
                fs.unlink(path.join(removeDir, file), err => {
                    if (err) return err;
                });
            }
        });
    }
})











