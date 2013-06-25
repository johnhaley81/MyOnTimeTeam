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

            $.when(this.getAllUsersData(), this.getProjects(), this.getReleases()).done(function (usersResponse, projectsResponse, releasesResponse)
            {
                if (!usersResponse || !usersResponse.data)
                    return;

                if (!projectsResponse || !projectsResponse.data)
                    return;

                if(!releasesResponse ||  !releasesResponse.data)
                return;
                 

                var projectArray = [];

                for (var i = 0 ; i < projectsResponse.data.length ; i++) {
                    recursivepush(projectsResponse.data[i], projectArray, 0);

                }


                viewModel.projects = ko.mapping.fromJS(projectArray);

                viewModel.filterProjectsBy = ko.observable(window.localStorage.getItem('filter') || "nofilter");

                var releaseArray = [];

                for (var i = 0 ; i < releasesResponse.data.length ; i++)
                {
                    recursivepush(releasesResponse.data[i], releaseArray, 0);
                }

                viewModel.releases = ko.mapping.fromJS(releaseArray);

                var users = usersResponse.data,
                    userModels = [],
                    usersWaitingForData = [];

                viewModel.sortBy = ko.observable(window.localStorage.getItem('sort') || "name");
                viewModel.showHidden = ko.observable(localStorage.getItem('showHidden') === "true");

                for (var i = 0, l = users.length; i < l; i++) {
                    userModels.push(new User(users[i], viewModel.showHidden));
                }

                viewModel.filterReleasesBy = ko.observable(window.localStorage.getItem('releasefilter') || "nofilter");

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

                var filtersort = window.localStorage.getItem('filter');

                if (filtersort)
                    $('[data-filtervalue="' + filtersort + '"] .icon-ok').removeClass('hide');

                $('[data-filtervalue]').unbind('click');

                $('[data-filtervalue]').click(function () {
                    var newFilter = $(this).attr('data-filtervalue');
                    localStorage.setItem('filter', newFilter);
                    viewModel.filterProjectsBy(newFilter);
                    $('[data-filtervalue] .icon-ok').addClass('hide');
                    $('[data-filtervalue="' + newFilter + '"] .icon-ok').removeClass('hide');
                    window.location.reload();
                   
                });

                var releasefiltersort = window.localStorage.getItem('releasefilter');

                if (releasefiltersort)
                    $('[releaseData-filtervalue="' + releasefiltersort + '"] .icon-ok').removeClass('hide');

                $('[releaseData-filtervalue]').unbind('click');

                $('[releaseData-filtervalue]').click(function () {
                    var newReleaseFilter = $(this).attr('releaseData-filtervalue');
                    localStorage.setItem('releasefilter', newReleaseFilter);
                    viewModel.filterReleasesBy(newReleaseFilter);
                    $('[releaseData-filtervalue] .icon-ok').addClass('hide');
                    $('[releaseData-filtervalue="' + newReleaseFilter + '"] .icon-ok').removeClass('hide');
                    window.location.reload();
                });
                // now copy the users from the view model into the array of users waiting for data so we can loop over them
                // without disturbing the original view model
             

                $.when(viewModel.filterProjectsBy(), viewModel.filterReleasesBy()).done(function (filterprojects, filterreleases)
                {
                    myOnTimeTeam.getNextUsersData(usersWaitingForData, filterprojects, filterreleases);

                    for (var i = 0, l = viewModel.users().length; i < l; i++) {
                        var user = viewModel.users()[i];
                        if (user.visible())
                            myOnTimeTeam.addUserToHandle(viewModel.users()[i], filterprojects, filterreleases);
                    }
                    
                });
            });

            return viewModel;
        },

        addUserToHandle: function (user, filterprojects, filterreleases) {
            if (usersToHandle === null) {
                usersToHandle = [user];
                this.getNextUsersData(null, filterprojects, filterreleases);
            }
            else {
                usersToHandle.push(user);
            }
        },

        getNextUsersData: function (userswaiting, projectFilter, releaseFilter) {
            var user = (usersToHandle || []).shift();
            if (!user) {
                usersToHandle = null;	//The last user has been handled, clear out the list
                //so we know to start over with the next user.
                return;
            }

            this.getUserData(user, projectFilter ,releaseFilter)
                .done(function () {
                    setTimeout(function () {
                        myOnTimeTeam.getNextUsersData(null, projectFilter, releaseFilter);
                    }, 333);
                })
                .fail(function () {
                    //Something failed. We're probably making too many requests at a time. Add
                    //this user back to the list, wait a second, then start the requests again.
                    usersToHandle.unshift(user);
                    setTimeout(function () {
                        myOnTimeTeam.getNextUsersData(null, projectFilter, releaseFilter);
                    }, 1000);
                });
        },

        getUserData: function (user, projectFilter, releaseFilter) {
            return $.when(myOnTimeTeam.getItemDetailsForUser('defects', user.id, projectFilter, releaseFilter)
                    , myOnTimeTeam.getItemDetailsForUser('features', user.id, projectFilter, releaseFilter)
                    , myOnTimeTeam.getItemDetailsForUser('incidents', user.id, projectFilter, releaseFilter))
                .done(function (defects, features, incidents) {
                    var getCount = function (itemType) {
                        if (itemType && itemType.metadata) {
                            return itemType.metadata.total_count;
                        } else {
                            return 0;
                        }
                    };

                    var getWorkRemainingMinutes = function (itemType) {
                        if (itemType && itemType.metadata) {
                            return itemType.metadata.minutes_remaining;
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
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('users/me', '&extend=all'), {});
        },

        getAllUsersData: function () {
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('users', '&include_inactive=false&extend=all'), {});
        },

        getItemDetailsForUser: function (itemType, userId, projectId, releaseId) {

            
            var target = this.getApiUrl(itemType, '&page=1&page_size=0&group_field=assigned_to_name&columns=project,release&user_id=' + userId);

            if (!(projectId === 'nofilter'))//if the ID isn't nofilter
                if (!(typeof projectId == 'undefined'))//if the ID isn't undefined
                    if(!(projectId === '0')) //if the ID isnt 0 for "All Projects"
                        target = target + '&project_id=' + projectId;
            if (!(releaseId === 'nofilter'))//if the ID isn't nofilter
                if (!(typeof releaseId == 'undefined'))//if the ID isn't undefined
                    if(!(releaseId === '0')) //if the ID isnt 0 for "All Releases"
                         target = target + '&release_id=' + releaseId;
            

            return window.myOnTimeTeam.makeApiCall(target);
        },

        getApiUrl: function (route, queryString) {
            return window.siteRoot + '/ontime/proxy?resource=' + route + (queryString || "");
        },

        getProjects: function () {
            
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('projects', ''), {});
        },

        getReleases: function () {
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('releases', ''), {});
        },

       
        makeApiCall: function (url)
        {
            var deferredResponse = $.Deferred();
            window.myOnTimeTeam.apiQueue.push({
                url: url,
                deferredResponse: deferredResponse
            });

            
    

            return deferredResponse;
        },

        processApiQueue: function(){
            var queue = window.myOnTimeTeam.apiQueue;

            if (!queue || !queue.length) return;

            
            var request = queue.shift();

            $.ajax(request.url, {}).done(function (response){
                request.deferredResponse.resolve(response);
            });

        },

        apiQueue: []
    };

    window.setInterval(function () {
        myOnTimeTeam.processApiQueue();
    }, 175);
    window.setInterval(function () {
        window.location.reload();
    }, 1140000);
   

    var recursivepush = function (root, projarray, indentLevel) {
        root.value = root.id;

     
        projarray.push(root);
        if (root.hasOwnProperty('children')) {
            if (root.children != null) {
                for (var i = 0; i < root.children.length ; i++) {
                    recursivepush(root.children[i], projarray, indentLevel + 1);
                }
            }
        }
    }

   

}(window, document, jQuery));