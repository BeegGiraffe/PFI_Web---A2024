import Model from './model.js';

export default class Like extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('PostId', 'string');
        this.addField('UserId', 'string');
        

        this.setKey("Id");
    }

    bindExtraData(instance) {
        instance = super.bindExtraData(instance);
        let usersRepository = new Repository(new UserModel());
        let ownerUser = usersRepository.get(instance.UserId);
        if (ownerUser) {
            instance.ownerName = ownerUser.Name;
        }
        else {
            instance.ownerName = 'unknown';
        }
        return instance;
    }
}