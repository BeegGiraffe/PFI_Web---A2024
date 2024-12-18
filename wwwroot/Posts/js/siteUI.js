////// Author: Nicolas Chourot
////// 2024
//////////////////////////////

const periodicRefreshPeriod = 2;
const waitingGifTrigger = 2000;
const minKeywordLenth = 3;
const keywordsOnchangeDelay = 500;

let categories = [];
let selectedCategory = "";
let currentETag = "";
let currentPostsCount = -1;
let periodic_Refresh_paused = false;
let postsPanel;
let itemLayout;
let waiting = null;
let showKeywords = false;
let keywordsOnchangeTimger = null;

Init_UI();
async function Init_UI() {
    postsPanel = new PageManager('postsScrollPanel', 'postsPanel', 'postSample', renderPosts);
    $('#createPost').on("click", async function () {
        showCreatePostForm();
    });
    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $("#showSearch").on('click', function () {
        toogleShowKeywords();
        showPosts();
    });

    installKeywordsOnkeyupEvent();
    await showPosts();
    start_Periodic_Refresh();
}

/////////////////////////// Search keywords UI //////////////////////////////////////////////////////////

function installKeywordsOnkeyupEvent() {

    $("#searchKeys").on('keyup', function () {
        clearTimeout(keywordsOnchangeTimger);
        keywordsOnchangeTimger = setTimeout(() => {
            cleanSearchKeywords();
            showPosts(true);
        }, keywordsOnchangeDelay);
    });
    $("#searchKeys").on('search', function () {
        showPosts(true);
    });
}
function cleanSearchKeywords() {
    /* Keep only keywords of 3 characters or more */
    let keywords = $("#searchKeys").val().trim().split(' ');
    let cleanedKeywords = "";
    keywords.forEach(keyword => {
        if (keyword.length >= minKeywordLenth) cleanedKeywords += keyword + " ";
    });
    $("#searchKeys").val(cleanedKeywords.trim());
}
function showSearchIcon() {
    $("#hiddenIcon").hide();
    $("#showSearch").show();
    if (showKeywords) {
        $("#searchKeys").show();
    }
    else
        $("#searchKeys").hide();
}
function hideSearchIcon() {
    $("#hiddenIcon").show();
    $("#showSearch").hide();
    $("#searchKeys").hide();
}
function toogleShowKeywords() {
    showKeywords = !showKeywords;
    if (showKeywords) {
        $("#searchKeys").show();
        $("#searchKeys").focus();
    }
    else {
        $("#searchKeys").hide();
        showPosts(true);
    }
}

/////////////////////////// Views management ////////////////////////////////////////////////////////////

function intialView() {
    let user = Users_API.getLoginUser();
    if (user) {
        if (user.isSuper)   
            $("#createPost").show();
        else    
            $("#createPost").hide();
    }
    else    
        $("#createPost").hide();

    $("#hiddenIcon").hide();
    $("#hiddenIcon2").hide();
    $('#menu').show();
    $('#commit').hide();
    $('#abort').hide();
    $('#form').hide();
    $('#form').empty();
    $('#aboutContainer').hide();
    $('#errorContainer').hide();
    showSearchIcon();
}
async function showPosts(reset = false) {
    intialView();
    $("#viewTitle").text("Fil de nouvelles");
    periodic_Refresh_paused = false;
    await postsPanel.show(reset);
}
function hidePosts() {
    postsPanel.hide();
    hideSearchIcon();
    $("#createPost").hide();
    $('#menu').hide();
    periodic_Refresh_paused = true;
}
function showForm() {
    hidePosts();
    $('#form').show();
    $('#commit').show();
    $('#abort').show();
}
function showError(message, details = "") {
    hidePosts();
    $('#form').hide();
    $('#form').empty();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#commit').hide();
    $('#abort').show();
    $("#viewTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").empty();
    $("#errorContainer").append($(`<div>${message}</div>`));
    $("#errorContainer").append($(`<div>${details}</div>`));
}
function showAdminUserForm () {
    showForm();
    $("#viewTitle").text("Gestionnaire des usagers");
    renderAdminUserForm();
}
function showCreatePostForm() {
    showForm();
    $("#viewTitle").text("Ajout de nouvelle");
    renderPostForm();
}
function showCreateUserForm() {
    showForm();
    $("#viewTitle").text("Ajout d'utilisateur");
    renderUserForm();
}
function showEditUserForm() {
    showForm();
    $("#viewTitle").text("Modification de profil");
    renderUserForm(Users_API.getLoginUser());
}
function showRemoveConfirmationForm(id) {
    showForm();
    $("#viewTitle").text("Suppression d'utilisateur");
    renderRemoveForm(id);
}
function showLoginForm() {
    showForm();
    $("#viewTitle").text("Connexion");
    renderLoginForm();
}
function showEditPostForm(id) {
    showForm();
    $("#viewTitle").text("Modification");
    renderEditPostForm(id);
}
function showDeletePostForm(id) {
    showForm();
    $("#viewTitle").text("Retrait");
    renderDeletePostForm(id);
}
function showAbout() {
    hidePosts();
    $("#hiddenIcon").show();
    $("#hiddenIcon2").show();
    $('#abort').show();
    $("#viewTitle").text("À propos...");
    $("#aboutContainer").show();
}

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

//////////////////////////// Posts rendering /////////////////////////////////////////////////////////////

function start_Periodic_Refresh() {
    $("#reloadPosts").addClass('white');
    $("#reloadPosts").on('click', async function () {
        $("#reloadPosts").addClass('white');
        postsPanel.resetScrollPosition();
        await showPosts();
    })
    setInterval(async () => {
        if (!periodic_Refresh_paused) {
            let etag = await Posts_API.HEAD();
            // the etag contain the number of model records in the following form
            // xxx-etag
            let postsCount = parseInt(etag.split("-")[0]);
            if (currentETag != etag) {           
                if (postsCount != currentPostsCount) {
                    console.log("postsCount", postsCount)
                    currentPostsCount = postsCount;
                    $("#reloadPosts").removeClass('white');
                } else
                    await showPosts();
                currentETag = etag;
            }
        }
    },
        periodicRefreshPeriod * 1000);
}
async function renderPosts(queryString) {
    let endOfData = false;
    queryString += "&sort=date,desc";
    compileCategories();
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (showKeywords) {
        let keys = $("#searchKeys").val().replace(/[ ]/g, ',');
        if (keys !== "")
            queryString += "&keywords=" + $("#searchKeys").val().replace(/[ ]/g, ',')
    }
    addWaitingGif();
    let response = await Posts_API.GetQuery(queryString);
    let likes = await Posts_API.GetLikes();
    if (!Posts_API.error) {
        currentETag = response.ETag;
        currentPostsCount = parseInt(currentETag.split("-")[0]);
        let Posts = response.data;
        if (Posts.length > 0) {
            Posts.forEach(Post => {
                postsPanel.append(renderPost(Post, likes.data));
            });
        } else
            endOfData = true;
        linefeeds_to_Html_br(".postText");
        highlightKeywords();
        attach_Posts_UI_Events_Callback();
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}
function renderPost(post, likes) {
    let date = convertToFrenchDate(UTC_To_Local(post.Date));
    let user = Users_API.getLoginUser();
    let names = ``;
    let isUserConnected = false;
    let likeId = "";
    if (user) {
        if (likes.length > 0) {
            likes.forEach(like => {
                if (like.PostId == post.Id) {
                    names += `${like.UserName} \n`;
                }
                
                if (like.UserId == user.Id && like.PostId == post.Id) {
                    isUserConnected = true;
                    likeId = like.Id;
                }
            });
            if (names == ``)
                names = `Liker`;
        }
        else
            names = `Liker`;    
    }

    let crudIcon = ``;
    let LikeOption = `<span class="likeCmd cmdIconSmall fa-regular fa-heart" postId="${post.Id}" title="${names}"></span>`;
    let DislikeOption = `<span class="dislikeCmd cmdIconSmall fa-solid fa-heart" likeId="${likeId}" postId="${post.Id}" title="${names}"></span>`;

    if (user) {
        if (user.isSuper) {
            crudIcon =  `
            <span class="editCmd cmdIconSmall fa fa-pencil" postId="${post.Id}" title="Modifier nouvelle"></span>
            <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
             ${ isUserConnected ? DislikeOption : LikeOption }
            `;
        }
        else if (user.isUser) {
            crudIcon =  `
            <span class="cmdIconSmall" postId="${post.Id}" title=""></span>
            <span class="cmdIconSmall" postId="${post.Id}" title=""></span>
             ${ isUserConnected ? DislikeOption : LikeOption}
            `;
        }
        else if (user.isAdmin) {
            crudIcon =  `
            <span class="cmdIconSmall" postId="${post.Id}" title=""></span>
            <span class="cmdIconSmall" postId="${post.Id}" title=""></span>
            <span class="deleteCmd cmdIconSmall fa fa-trash" postId="${post.Id}" title="Effacer nouvelle"></span>
            `;
        }
    }
       

    return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                ${crudIcon}
            </div>
            <div class="postTitle"> ${post.Title} </div>
            <img class="postImage" src='${post.Image}'/>
            <div class="postOwnerAndDate">
                <div class="ownerLayout">
                    <div class="avatar" style="background-image:url('${post.OwnerAvatar}')"></div>
                    ${post.OwnerName}
                </div>
                <div class="postDate"> ${date} </div>
            </div>
            <div postId="${post.Id}" class="postTextContainer hideExtra">
                <div class="postText" >${post.Text}</div>
            </div>
            <div class="postfooter">
                <span postId="${post.Id}" class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span postId="${post.Id}" class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>         
        </div>
    `);
}

async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            if (!categories.includes(selectedCategory))
                selectedCategory = "";
            updateDropDownMenu(categories);
        }
    }
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    let user = Users_API.getLoginUser();
    DDMenu.empty();
    if (user) {
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="editUser">
                <div class="avatar" style="background-image:url('${user.Avatar}')"></div>
                ${user.Name}
            </div>`));
        DDMenu.append($(`<div class="dropdown-divider"></div> `));
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="deconnectUser">
                <i class="cmdIcon fa fa-left-bracket" title="Déconnexion"></i>‎ Déconnexion
            </div>`));
        DDMenu.append($(`<div class="dropdown-divider"></div> `));

        if(user.isAdmin) {
            DDMenu.append($(`
                <div class="dropdown-item menuItemLayout" id="adminUser">
                    <i class="cmdIcon fa fa-user-shield" title="Gestionnaire d'utilisateur"></i>‎ Gestionnaire d'utilisateur
                </div>`));
            DDMenu.append($(`<div class="dropdown-divider"></div> `));
        }
    }
    else {
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout" id="connectUser">
                <i class="cmdIcon fa fa-right-to-bracket" title="Connexion"></i>‎ Connexion
            </div>`));
        DDMenu.append($(`<div class="dropdown-divider"></div> `));
    }
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        showAbout();
    });
    $('#allCatCmd').on("click", async function () {
        selectedCategory = "";
        await showPosts(true);
        updateDropDownMenu();
    });
    $('#connectUser').on("click", async function () {
        showLoginForm();
    });
    $('#deconnectUser').on("click", async function () {
        await Users_API.logout();
        await showPosts();
    });
    $('#editUser').on("click", async function () {
        showEditUserForm();
    });
    $('#deleteUser').on("click", async function () {
        showDeleteUserForm();
    });
    $('#adminUser').on("click", async function () {
        showAdminUserForm();
    });
    $('.category').on("click", async function () {
        selectedCategory = $(this).text().trim();
        await showPosts(true);
        updateDropDownMenu();
    });
}
function attach_Posts_UI_Events_Callback() {

    linefeeds_to_Html_br(".postText");
    // attach icon command click event callback
    $(".editCmd").off();
    $(".editCmd").on("click", function () {
        showEditPostForm($(this).attr("postId"));
    });
    $(".deleteCmd").off();
    $(".deleteCmd").on("click", function () {
        showDeletePostForm($(this).attr("postId"));
    });
    $(".likeCmd").off();
    $(".likeCmd").on("click", async function () {
        let like = {};
        like.Id = 0;
        like.PostId = $(this).attr("postId");
        like.UserId = Users_API.getLoginUser().Id;
        Posts_API.addLike(like);
        //postsPanel.scrollToElem($(this).attr("postId"));
        await showPosts();
    });
    $(".dislikeCmd").off();
    $(".dislikeCmd").on("click", async function () {
        Posts_API.DeleteLike($(this).attr("likeId"));
        //postsPanel.scrollToElem($(this).attr("postId"));
        await showPosts();
    });
    $(".moreText").off();
    $(".moreText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).show();
        $(`.lessText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('showExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('hideExtra');
    })
    $(".lessText").off();
    $(".lessText").click(function () {
        $(`.commentsPanel[postId=${$(this).attr("postId")}]`).hide();
        $(`.moreText[postId=${$(this).attr("postId")}]`).show();
        $(this).hide();
        postsPanel.scrollToElem($(this).attr("postId"));
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).addClass('hideExtra');
        $(`.postTextContainer[postId=${$(this).attr("postId")}]`).removeClass('showExtra');
    })
}
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        postsPanel.itemsPanel.append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

/////////////////////// Posts content manipulation ///////////////////////////////////////////////////////

function linefeeds_to_Html_br(selector) {
    $.each($(selector), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}
function highlight(text, elem) {
    text = text.trim();
    if (text.length >= minKeywordLenth) {
        var innerHTML = elem.innerHTML;
        let startIndex = 0;

        while (startIndex < innerHTML.length) {
            var normalizedHtml = innerHTML.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var index = normalizedHtml.indexOf(text, startIndex);
            let highLightedText = "";
            if (index >= startIndex) {
                highLightedText = "<span class='highlight'>" + innerHTML.substring(index, index + text.length) + "</span>";
                innerHTML = innerHTML.substring(0, index) + highLightedText + innerHTML.substring(index + text.length);
                startIndex = index + highLightedText.length + 1;
            } else
                startIndex = innerHTML.length + 1;
        }
        elem.innerHTML = innerHTML;
    }
}
function highlightKeywords() {
    if (showKeywords) {
        let keywords = $("#searchKeys").val().split(' ');
        if (keywords.length > 0) {
            keywords.forEach(key => {
                let titles = document.getElementsByClassName('postTitle');
                Array.from(titles).forEach(title => {
                    highlight(key, title);
                })
                let texts = document.getElementsByClassName('postText');
                Array.from(texts).forEach(text => {
                    highlight(key, text);
                })
            })
        }
    }
}

//////////////////////// Forms rendering /////////////////////////////////////////////////////////////////

async function renderEditPostForm(id) {
    $('#commit').show();
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            showError("Post introuvable!");
    } else {
        showError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}

async function renderDeletePostForm(id) {
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;
        if (post !== null) {
            let date = convertToFrenchDate(UTC_To_Local(post.Date));
            $("#form").append(`
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            linefeeds_to_Html_br(".postText");
            // attach form buttons click event callback
            $('#commit').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    await showPosts();
                }
                else {
                    console.log(Posts_API.currentHttpError)
                    showError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", async function () {
                await showPosts();
            });

        } else {
            showError("Post introuvable!");
        }
    } else
        showError(Posts_API.currentHttpError);
}
async function renderRemoveForm(id) {
    if (id) {
        $("#form").show();
        $("#form").empty();
        $("#form").append(`
            <form class="form" id="removeForm">
                <input type="hidden" name="Id" value="${id}">
                <input type="submit" value="Effacer mon compte" id="deleteUser" class="btn btn-primary">
                <input type="button" value="Annuler" id="goBack" class="btn btn-primary">
            </form>
        `);

        $("#goBack").click(function () {
            showEditUserForm();
        });
        // attach form buttons click event callback
        $('#removeForm').on("submit", async function (event) {
            event.preventDefault();
            let result = getFormData($("#removeForm"));
            user = await Users_API.Delete(result.Id);
            if (!Users_API.error) {
                await showPosts();
            }
            else
                showError("Une erreur est survenue! ", Users_API.currentHttpError);
        });
        $('#cancel').on("click", async function () {
            await showPosts();
        });

    } else {
        showError("User introuvable!");
    }
}
function newPost() {
    let Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "news-logo-upload.png";
    Post.Category = "";
    return Post;
}
function newUser() {
    let User = {};
    User.Id = 0;
    User.Name = "";
    User.Password = "";
    User.Email = "";
    User.Avatar = "no-avatar.png";
    User.Authorizations = 0;
    return User;
}
function newConnection() {
    let connection = {};
    connection.Email = "";
    connection.Password = "";
    return connection;
}
function renderPostForm(post = null) {
    let create = post == null;
    if (create) post = newPost();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
             <input type="hidden" name="Date" value="${post.Date}"/>
            <input type="hidden" name="OwnerId" value="${post.OwnerId}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Url" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary displayNone">
        </form>
    `);
    if (create) $("#keepDateControl").hide();

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#commit").click(function () {
        $("#commit").off();
        return $('#savePost').trigger("click");
    });
    $('#postForm').on("submit", async function (event) {
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory)
            selectedCategory = "";
        if (create || !('keepDate' in post))
            post.Date = Local_to_UTC(Date.now());
            post.OwnerId = Users_API.getLoginUser().Id;
        delete post.keepDate;
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            await showPosts();
            postsPanel.scrollToElem(post.Id);
        }
        else
            showError("Une erreur est survenue! ", Posts_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
function renderUserForm(user = null) {
    let create = user == null;
    if (create) user = newUser();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="userForm">
            <input type="hidden" name="Id" value="${user.Id}"/>
             <input type="hidden" name="Created" value="${user.Created}"/>
            <label for="Name" class="form-label">Nom </label>
            <input 
                class="form-control"
                name="Name" 
                id="Name" 
                placeholder="Nom"
                required
                RequireMessage="Veuillez entrer un nom"
                InvalidMessage="Le nom comporte un caractère illégal"
                value="${user.Name}"
            />
            <label for="Email" class="form-label">Email </label>
            <input 
                class="form-control"
                name="Email" 
                id="Email" 
                placeholder="Email"
                required
                RequireMessage="Veuillez entrer un Email"
                InvalidMessage="L'Email comporte un caractère illégal"
                value="${user.Email}"
            />
            <label for="Password" class="form-label">Mot de passe </label>
            <input 
                class="form-control"
                name="Password" 
                id="Password" 
                placeholder="Mot de passe"
                required
                RequireMessage="Veuillez entrer un mot de passe"
                InvalidMessage="Le mot de passe comporte un caractère illégal"
                value="${user.Password}"
            />
            <label class="form-label">Avatar </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Avatar' 
                     imageSrc='${user.Avatar}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
            </div>
            <input type="submit" value="Enregistrer" id="saveUser" class="btn btn-primary">
            <input type="button" value="Effacer ce compte" userId="${user.Id}" id="removeUser" class="btn btn-primary">
        </form>
    `);
    if (create) {
        $("#keepDateControl").hide();
        $("#removeUser").hide();
    } 

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#removeUser").click(function () {
        showRemoveConfirmationForm($(this).attr("userId"));
    });
    $('#userForm').on("submit", async function (event) {
        event.preventDefault();
        let user = getFormData($("#userForm"));
        if (create || !('keepDate' in user))
            user.Created = Local_to_UTC(Date.now());
        delete user.keepDate;
        user = await Users_API.Save(user, create);
        if (!Users_API.error) {
            create ? showLoginForm() : await showPosts();
        }
        else
            showError("Une erreur est survenue! ", Users_API.currentHttpError);
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}

function renderLoginForm() {
    let user = newConnection();
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="loginForm">
            <label for="Email" class="form-label">Email </label>
            <input 
                class="form-control"
                name="Email" 
                id="Email" 
                placeholder="Email"
                required
                RequireMessage="Veuillez entrer un Email"
                InvalidMessage="L'Email comporte un caractère illégal"
                value="${user.Email}"
            />
            <label for="Password" class="form-label">Mot de passe </label>
            <input 
                class="form-control"
                name="Password" 
                id="Password" 
                placeholder="Mot de passe"
                required
                RequireMessage="Veuillez entrer un mot de passe"
                InvalidMessage="Le mot de passe comporte un caractère illégal"
                value="${user.Password}"
            />
            <input type="submit" value="Connecter" id="saveLogin" class="btn btn-primary">
            <br>
            <input type="button" value="S'inscrire" id="register" class="btn btn-primary">
        </form>
    `);

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!

    $("#register").click(function () {
        showCreateUserForm();
    });
    $('#loginForm').on("submit", async function (event) {
        event.preventDefault();
        let user = getFormData($("#loginForm"));
        await Users_API.Login(user);
        user = Users_API.getLoginUser();
        if (!Users_API.error) {
            if (!user.isBlocked) {
                await showPosts();
            }
            else {
                Users_API.logout();
                showError(`${user.Name}, votre compte est bloqué.`);
            }
        }
    });
    $('#cancel').on("click", async function () {
        await showPosts();
    });
}
async function renderAdminUserForm() {
    let users = await Users_API.Get();
    users = users.data;
    $("#form").show();
    $("#form").empty();

    users.forEach(user => {
        $("#form").append(renderUser(user));
    });

    initImageUploaders();
    initFormValidation(); // important do to after all html injection!
    
    $('.typeCmd').on('click', async function() {
        let userId = $(this).attr('typeUserId');
        let user = await Users_API.Get(userId);
        user = user.data[0];
        await Users_API.Promote(user);
        showUsersAdmin();

    });
    $('.blockCmd').on('click', async function() {
        let userId = $(this).attr('blockUserId');
        let user = await Users_API.Get(userId);
        user = user.data[0];
        await Users_API.Block(user);
        showUsersAdmin();

    });
    $('.unblockCmd').on('click', async function() {
        let userId = $(this).attr('deleteUserId');
        let user = await Users_API.Get(userId);
        user = user.data[0];
        await Users_API.Block(user);
        showUsersAdmin();

    });
}
function renderUser(user) {
    $("#form").append(`
        <div class="userRow" user_id=${user.Id}">
            <div class="userContainer noselect">
                <div class="userLayout">
                    <div class="userAvatarMedium" style="background-image:url('${user.Avatar}')"></div>
                    <div class="userInfo">
                        <span class="userName">${user.Name}</span>
                    </div>
                </div>
                <div class="userCommandPanel">
                    <span class="typeCmd cmdIcon fa-solid fa-user-plus" typeUserId="${user.Id}" id="userType" title="Changer ${user.Name}"></span>
                    <span class="blockCmd cmdIcon fa-solid fa-lock" blockUserId="${user.Id}" id="userBlock" title="Bloquer ${user.Name}"></span>
                    <span class="deleteCmd cmdIcon fa fa-trash" deleteUserId="${user.Id}" is="userDelete" title="Effacer ${user.Name}"></span>
                </div>
            </div>
        </div>
    `);
}

function getFormData($form) {
    // prevent html injections
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    // grab data from all controls
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
