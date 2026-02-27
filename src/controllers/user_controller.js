const UserService = require('../services/user_service');
const SlackService = require('../services/slack_service');

class UserController {
  async create(req, res) {
    try {
      
        const user = await UserService.create(req.body);

        SlackService.notifyNewUser({ userId: user.id, userName: user.name, userEmail: user.email });

        return res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ error: error.message });
    }
    
  }

  async findAll(req, res) {
    const users = await UserService.findAll();
    return res.json(users);
  }

  async findById(req, res) {
    const user = await UserService.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  }

   async update(req, res) {
    try {
        const user = await UserService.update(req.params.id, req.body);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({
            message: 'User updated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
        const success = await UserService.delete(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.log(error);
        return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new UserController();
