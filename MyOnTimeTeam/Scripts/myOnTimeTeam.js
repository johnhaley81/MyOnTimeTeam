(function (window, document, $) {
    function User(serverUser, showHiddenObservable) {
        this.id = serverUser.id;
        this.firstName = serverUser.first_name;
        this.lastName = serverUser.last_name;
        this.userImage = serverUser.user_image;

        var hiddenUsers = localStorage.getItem('hiddenUsers').split(',');
        var isHidden = $.inArray(this.id.toString(), hiddenUsers) !== -1;
        this.hidden = ko.observable(isHidden);
        this.hide = function () {
            var hiddenUsers = localStorage.getItem('hiddenUsers').split(',');
            hiddenUsers.push(this.id.toString());
            localStorage.setItem('hiddenUsers', hiddenUsers);
            this.hidden(true);
        };
        this.show = function () {
            var hiddenUsers = localStorage.getItem('hiddenUsers').split(','),
				that = this;
            hiddenUsers = $.grep(hiddenUsers, function (item) {
                return item !== that.id;
            });
            localStorage.setItem('hiddenUsers', hiddenUsers);
            this.hidden(false);
        };
        this.visible = ko.computed(function () {
            return !this.hidden() || showHiddenObservable();
        }, this);
        this.visible.subscribe(function () {
            if (this.visible() && !this.dataLoaded())
                window.myOnTimeTeam.addUserToHandle(this);
        }, this);
        this.dataLoaded = ko.observable(false);

        this.fullName = ko.computed(function () {
            return this.firstName + " " + this.lastName;
        }, this);

        this.getCount = function (type) {
            return this[type + "Count"];
        };

        this.defectsCount = ko.observable(0);

        this.featuresCount = ko.observable(0);

        this.incidentsCount = ko.observable(0);

        this.itemsCount = ko.computed(function () {
            return this.defectsCount() + this.featuresCount() + this.incidentsCount();
        }, this);

        this.workRemainingMinutes = ko.observable(0);
        this.workRemaining = ko.computed(function () {
            return Math.round(this.workRemainingMinutes() / 60) + " Hours";
        }, this);
    };

    var usersToHandle = null;	//null means no users are currently being processed.
    //an array, empty or otherwise, means other users are
    //already being processed.

    window.myOnTimeTeam = {
        refreshData: function () {
            var viewModel = {};

            $.when(this.getAllUsersData(), this.getProjects(), this.getReleases()).done(function (usersResponse, projectsResponse, releasesResponse) {
                if (!usersResponse || !usersResponse[0] || !usersResponse[0].data)
                    return;

                if (!projectsResponse || !projectsResponse[0] || !projectsResponse[0].data)
                    return;

                if(!releasesResponse || !releasesResponse[0] || !releasesResponse[0].data)
                return;

                var projectArray = [];

                for (var i = 0 ; i < projectsResponse[0].data.length ; i++) {
                    recursivepush(projectsResponse[0].data[i], projectArray, 0);

                }


                viewModel.projects = ko.mapping.fromJS(projectArray);

                var releaseArray = [];

                for (var i = 0 ; i < releasesResponse[0].data.length ; i++)
                {
                    recursivepush(releasesResponse[0].data[i], releaseArray, 0);
                }

                viewModel.releases = ko.mapping.fromJS(releaseArray);

                var users = usersResponse[0].data,
					userModels = [],
					usersWaitingForData = [];

                viewModel.sortBy = ko.observable(window.localStorage.getItem('sort') || "name");
                viewModel.showHidden = ko.observable(localStorage.getItem('showHidden') === "true");

                for (var i = 0, l = users.length; i < l; i++) {
                    userModels.push(new User(users[i], viewModel.showHidden));
                }



                viewModel.users = ko.observableArray(userModels);
                viewModel.usersSorted = ko.computed(function () {
                    var sortType = this.sortBy(),
						sortFn,
						visibleArray = $.grep(this.users(), function (user) {
						    return user.visible();
						});

                    switch (sortType) {
                        case 'name':
                            return visibleArray;	//The list comes back from the server sorted by name, just return it
                        case 'work':
                            sortFn = function (a, b) {
                                return a.workRemainingMinutes() > b.workRemainingMinutes() ? -1 :
									a.workRemainingMinutes() < b.workRemainingMinutes() ? 1 :
									0;
                            };
                            break;
                        case 'defects':
                        case 'features':
                        case 'incidents':
                        case 'items':
                            sortFn = function (a, b) {
                                return a.getCount(sortType)() > b.getCount(sortType)() ? -1 :
									a.getCount(sortType)() < b.getCount(sortType)() ? 1 :
									0;
                            };
                            break;
                    }
                    return visibleArray.sort(sortFn);
                }, viewModel);
                ko.applyBindings(viewModel);

                // now copy the users from the view model into the array of users waiting for data so we can loop over them
                // without disturbing the original view model
                for (var i = 0, l = viewModel.users().length; i < l; i++) {
                    var user = viewModel.users()[i];
                    if (user.visible())
                        myOnTimeTeam.addUserToHandle(viewModel.users()[i]);
                }

                myOnTimeTeam.getNextUsersData(usersWaitingForData);
            });

            return viewModel;
        },

        addUserToHandle: function (user) {
            if (usersToHandle === null) {
                usersToHandle = [user];
                this.getNextUsersData();
            }
            else {
                usersToHandle.push(user);
            }
        },

        getNextUsersData: function () {
            var user = (usersToHandle || []).shift();
            if (!user) {
                usersToHandle = null;	//The last user has been handled, clear out the list
                //so we know to start over with the next user.
                return;
            }

            this.getUserData(user)
				.done(function () {
				    setTimeout(function () {
				        myOnTimeTeam.getNextUsersData();
				    }, 333);
				})
				.fail(function () {
				    //Something failed. We're probably making too many requests at a time. Add
				    //this user back to the list, wait a second, then start the requests again.
				    usersToHandle.unshift(user);
				    setTimeout(function () {
				        myOnTimeTeam.getNextUsersData();
				    }, 1000);
				});
        },

        getUserData: function (user) {
            return $.when(myOnTimeTeam.getItemDetailsForUser('defects', user.id)
					, myOnTimeTeam.getItemDetailsForUser('features', user.id)
					, myOnTimeTeam.getItemDetailsForUser('incidents', user.id))
				.done(function (defects, features, incidents) {
				    var getCount = function (itemType) {
				        if (itemType && itemType[0] && itemType[0].metadata) {
				            return itemType[0].metadata.total_count;
				        } else {
				            return 0;
				        }
				    };

				    var getWorkRemainingMinutes = function (itemType) {
				        if (itemType && itemType[0] && itemType[0].metadata) {
				            return itemType[0].metadata.minutes_remaining;
				        } else {
				            return 0;
				        }
				    };

				    // Update the data for this user in the viewModel knockout object
				    user.defectsCount(getCount(defects));
				    user.featuresCount(getCount(features));
				    user.incidentsCount(getCount(incidents));
				    user.workRemainingMinutes(Math.round((getWorkRemainingMinutes(defects)
						+ getWorkRemainingMinutes(features)
						+ getWorkRemainingMinutes(incidents))));
				    user.dataLoaded(true);
				})
				.fail(function () {
				})
				.always(function () {
				});
        },

        getCurrentUserData: function () {
            return $.ajax(this.getApiUrl('users/me', '&extend=all'), {});
        },

        getAllUsersData: function () {
            return $.ajax(this.getApiUrl('users', '&include_inactive=false&extend=all'), {});
        },

        getItemDetailsForUser: function (itemType, userId) {
            return $.ajax(this.getApiUrl(itemType, '&page=1&page_size=0&group_field=assigned_to_name&columns=project,release&user_id=' + userId), {});
        },

        getApiUrl: function (route, queryString) {
            return window.siteRoot + '/ontime/proxy?resource=' + route + (queryString || "");
        },

        getProjects: function () {
            return $.ajax(this.getApiUrl('projects', ''), {});
        },

        getReleases: function () {
            return $.ajax(this.getApiUrl('releases', ''), {});
        }

       

    };

    var recursivepush = function (root, projarray, indentLevel) {
        root["indentedName"] = root.name;


        for (var j = 0; j <= indentLevel; j++) {
            root["indentedName"] = "<span style=\"margin-left:1em\"></span>" + root["indentedName"];
        }
        projarray.push(root);
        if (root.hasOwnProperty('children')) {
            if (root.children != null) {
                for (var i = 0; i < root.children.length ; i++)
                {
                    recursivepush(root.children[i], projarray, indentLevel + 1);
                }
            }
        }
    }

   

}(window, document, jQuery));