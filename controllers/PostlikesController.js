import LikeModel from '../models/like.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';

export default class PostlikesModelsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new LikeModel()));
    }

    togglelike (incomingLike) {

    }
}

