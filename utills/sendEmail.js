import nodeMailer from 'nodemailer';

const sendEmail = async (email, subject, message) => {
    const transporter = nodeMailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD
        }
    });

    transporter.verify((error, success) => {
        if(error){
            console.error(error);
        }else{
            console.log("SMTP connection successful!");
        }
    })

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: email,
        subject: subject,
        html: message
    }

    const info = await transporter.sendMail(mailOptions);
}


export default sendEmail;