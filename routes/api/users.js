const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const User = require('./models/User.js');

// @route    POST api/users
// @desc     Register user
// @access   Public
router.post(
	'/',
	[
		check('name', 'Name is required').not().isEmpty(),
		check('email', 'Please include a valid email').isEmail(),
		check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { name, email, password } = req.body;

		try {
			let user = await User.findOne({ email });

			// check if user exists
			if (user) {
				return res.status(400).json({
					errors: [{ msg: 'User already exists' }]
				});
			}

			// Get avatar from gravatar by email, set default is not found
			const avatar = gravatar.url(email, {
				s: '200',
				r: 'pg',
				d: 'mm'
			});

			user = new User({
				name,
				email,
				password,
				avatar
			});

			// encryp password with bcrypt
			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(password, salt);

			// save user to database
			await user.save();

			const payload = {
				user: {
					id: user.id
				}
			};

			jwt.sign(payload, process.env.jwtSecret, { expiresIn: 360000 }, (error, token) => {
				if (error) {
					throw new Error('Unable to generate jsonwebtoken');
				} else {
					res.status(201).json({ token });
				}
			});
		} catch (error) {
			console.error(error);
			res.status(500).json({
				errors: [{ msg: 'Server error' }]
			});
		}
	}
);

module.exports = router;
