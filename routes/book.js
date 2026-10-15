
const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { db } = require("../mydb/bookings");

const bookingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "طلبات كثيرة جدًا، حاول مرة أخرى بعد قليل"
    }
});

const listingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "طلبات كثيرة جدًا، حاول مرة أخرى بعد قليل"
    }
});

function generateId() {
    return crypto.randomBytes(16).toString("hex");
}

function generateBookingCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "EO-";

    for (let i = 0; i < 6; i++) {
        code += characters[crypto.randomInt(0, characters.length)];
    }

    return code;
}

router.post("/register", bookingLimiter, (req, res) => {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone_number || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const nationality = String(req.body?.nationality || "").trim();
    const password = String(req.body?.password || "");
    const confirmPassword = String(req.body?.confirm_password || "");
    const sharmArea = String(req.body?.sharm_area || "").trim();
    const language = String(req.body?.language || "ar").trim();
    const specialRequests = String(req.body?.special_requests || "").trim();

    if (!name || !phone || !nationality || !password || !confirmPassword || !sharmArea) {
        return res.status(400).json({
            success: false,
            message: "يرجى ملء جميع الحقول المطلوبة"
        });
    }

    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            message: "رقم الموبايل غير صحيح"
        });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            success: false,
            message: "البريد الإلكتروني غير صحيح"
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            message: "كلمة السر يجب ألا تقل عن 8 أحرف"
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: "كلمتا السر غير متطابقتين"
        });
    }

    if (!["ar", "en", "ru"].includes(language)) {
        return res.status(400).json({
            success: false,
            message: "لغة التطبيق غير صحيحة"
        });
    }

    const defaultProfilePicture = "https://i.ibb.co/HRbkkLw/3177440-1.jpg";

    const insertBooking = (attempt = 0) => {
        if (attempt >= 10) {
            return res.status(500).json({
                success: false,
                message: "تعذر إنشاء كود حجز فريد، حاول مرة أخرى"
            });
        }

        const id = generateId();
        const bookingCode = generateBookingCode();

        db.run(
            `INSERT INTO users (
                id,
                name,
                email,
                phone_number,
                profile_picture,
                password,
                account_type,
                nationality,
                sharm_area,
                language,
                special_requests,
                booking_code,
                account_status
            ) VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, 'active')`,
            [
                id,
                name,
                email || null,
                phone,
                defaultProfilePicture,
                password,
                nationality,
                sharmArea,
                language,
                specialRequests,
                bookingCode
            ],
            function (err) {
                if (err) {
                    if (err.message.includes("booking_code")) {
                        return insertBooking(attempt + 1);
                    }

                    if (err.message.includes("phone_number")) {
                        return res.status(409).json({
                            success: false,
                            message: "رقم الموبايل مسجل بالفعل"
                        });
                    }

                    if (err.message.includes("email")) {
                        return res.status(409).json({
                            success: false,
                            message: "البريد الإلكتروني مسجل بالفعل"
                        });
                    }

                    console.error(err.message);

                    return res.status(500).json({
                        success: false,
                        message: "حدث خطأ أثناء إنشاء الحجز"
                    });
                }

                return res.status(201).json({
                    success: true,
                    message: "تم إنشاء الحجز بنجاح",
                    booking: {
                        id,
                        name,
                        email: email || null,
                        phone_number: phone,
                        nationality,
                        sharm_area: sharmArea,
                        language,
                        special_requests: specialRequests,
                        booking_code: bookingCode,
                        account_status: "active"
                    }
                });
            }
        );
    };

    insertBooking();
});

router.get("/", listingLimiter, (req, res) => {
    db.all(
        `SELECT
            id,
            name,
            email,
            phone_number,
            profile_picture,
            nationality,
            sharm_area,
            language,
            special_requests,
            booking_code,
            account_status,
            created_at
        FROM users
        ORDER BY created_at DESC`,
        [],
        (err, bookings) => {
            if (err) {
                console.error(err.message);

                return res.status(500).json({
                    success: false,
                    message: "حدث خطأ أثناء جلب الحجوزات"
                });
            }

            return res.status(200).json({
                success: true,
                count: bookings.length,
                bookings
            });
        }
    );
});

module.exports = router;
