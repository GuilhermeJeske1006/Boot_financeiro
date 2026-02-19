const AuthService = require('../services/auth_service');


class AuthController {

    async login(req, res) {
        const { email, password } = req.body;
        try {
            const token = await AuthService.login({ email, password });
            return res.status(200).json({ token });
        }
        catch (error) {
            console.log(error);
            return res.status(401).json({ error: error.message });
        }
    }

    logout(req, res) {
        // Implement logout logic if needed
        return res.status(200).json({ message: 'Logged out successfully' });
    }


}

module.exports = new AuthController();