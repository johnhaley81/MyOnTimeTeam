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

        initializeViewModel: function (viewModel) {
            viewModel.defectId = ko.observable(0);
            viewModel.featureId = ko.observable(0);
            viewModel.incidentId = ko.observable(0);
            viewModel.projectId = ko.observable(0);
            viewModel.releaseId = ko.observable(0);

            return viewModel;
        },

        populateItemNames: function (defects, features, incidents) {
            var name = [];
            name.push(defects.data[0].filter_type);
            name.push(features.data[0].filter_type);
            name.push(incidents.data[0].filter_type);

            return name;
        },

        populateFilterArray: function (itemResponse) {
            itemArray = [];
            for (var i = 0 ; i < itemResponse.data.length ; i++)
                itemArray.push(itemResponse.data[i]);

            return itemArray;
        },

        populateItemFilterArray: function (defectArray, featureArray, incidentArray) {

            var itemArray = [];

            itemArray.push(defectArray);
            itemArray.push(featureArray);
            itemArray.push(incidentArray);

            return itemArray;
        },

        populateDesignArray: function (designResponse, name) {
            var designArray = [];


            var allDesign = {
                name: "All " + name,
                id: 0
            };
            designArray.push(allDesign);

            for (var i = 0 ; i < designResponse.data.length ; i++) {
                recursivepush(designResponse.data[i], designArray, 0);

            }

            return designArray;
        },

        populateUserModels: function (userResponse, viewModel) {

            var userModels = [];

            for (var i = 0, l = userResponse.data.length; i < l; i++) {
                userModels.push(new User(userResponse.data[i], viewModel.showHidden));
            }


            return userModels;

        },


        refreshData: function () {
            var viewModel = {}
            viewModel = window.myOnTimeTeam.initializeViewModel(viewModel);

            $.when(this.getUsersList(), this.getProjects(), this.getReleases(), this.getFilters('defects'), this.getFilters('features'), this.getFilters('incidents')).done(function (usersResponse, projectsResponse, releasesResponse, defectFilterResponse, featureFilterResponse, incidentFilterResponse) {
                if (!usersResponse || !usersResponse.data)
                    return;

                if (!projectsResponse || !projectsResponse.data)
                    return;

                if (!releasesResponse || !releasesResponse.data)
                    return;

                if (!defectFilterResponse || !defectFilterResponse.data)
                    return;

                if (!featureFilterResponse || !featureFilterResponse.data)
                    return;

                if (!incidentFilterResponse || !incidentFilterResponse.data)
                    return;




                var nameArray = window.myOnTimeTeam.populateItemNames(defectFilterResponse, featureFilterResponse, incidentFilterResponse);
                var defectFilterArray = window.myOnTimeTeam.populateFilterArray(defectFilterResponse);
                var featureFilterArray = window.myOnTimeTeam.populateFilterArray(featureFilterResponse);
                var incidentFilterArray = window.myOnTimeTeam.populateFilterArray(incidentFilterResponse);
                var itemFilters = window.myOnTimeTeam.populateItemFilterArray(defectFilterArray, featureFilterArray, incidentFilterArray);
                var projectArray = window.myOnTimeTeam.populateDesignArray(projectsResponse, 'Projects');
                var releaseArray = window.myOnTimeTeam.populateDesignArray(releasesResponse, 'Releases');




                viewModel.itemTypes = ko.mapping.fromJS(nameArray);
                viewModel.itemFilters = ko.mapping.fromJS(itemFilters);
                viewModel.projects = ko.mapping.fromJS(projectArray);
                viewModel.releases = ko.mapping.fromJS(releaseArray);






                viewModel.sortBy = ko.observable(window.localStorage.getItem('sort') || "name");
                viewModel.showHidden = ko.observable(localStorage.getItem('showHidden') === "true");
                viewModel.showInactive = ko.observable(localStorage.getItem('showInactive') === "true");
                viewModel.filterProjectsBy = ko.observable(window.localStorage.getItem('filter') || "nofilter");
                viewModel.filterReleasesBy = ko.observable(window.localStorage.getItem('releasefilter') || "nofilter");

                var userModels = window.myOnTimeTeam.populateUserModels(usersResponse, viewModel);
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
                viewModel.updateProject = ko.computed(function () {
                    this.projectId();
                    var newFilter = this.projectId();
                    localStorage.setItem('filter', newFilter);
                    viewModel.filterProjectsBy(newFilter);


                }, viewModel);












                /*var filtersort = window.localStorage.getItem('filter');
                var releasefiltersort = window.localStorage.getItem('releasefilter');

                if (filtersort)
                    $('[data-filtervalue="' + filtersort + '"] .icon-ok').removeClass('hide');

                $('[data-filtervalue]').unbind('click');

                $('[data-filtervalue]').click(function () {
                    var newFilter = $('option:selected', this).attr('data-filtervalue');
                    localStorage.setItem('filter', newFilter);
                    viewModel.filterProjectsBy(newFilter);
                    $('[data-filtervalue] .icon-ok').addClass('hide');
                    $('[data-filtervalue="' + newFilter + '"] .icon-ok').removeClass('hide');
                    window.location.reload();
                   
                });*/





                //if (releasefiltersort)
                //    $('[releaseData-filtervalue="' + releasefiltersort + '"] .icon-ok').removeClass('hide');

                //$('[releaseData-filtervalue]').unbind('click');

                //$('[releaseData-filtervalue]').click(function () {
                //    var newReleaseFilter = $(this).attr('releaseData-filtervalue');
                //    localStorage.setItem('releasefilter', newReleaseFilter);
                //    viewModel.filterReleasesBy(newReleaseFilter);
                //    $('[releaseData-filtervalue] .icon-ok').addClass('hide');
                //    $('[releaseData-filtervalue="' + newReleaseFilter + '"] .icon-ok').removeClass('hide');
                //    window.location.reload();
                //});
                // now copy the users from the view model into the array of users waiting for data so we can loop over them
                // without disturbing the original view model


                //$.when(viewModel.filterProjectsBy(), viewModel.filterReleasesBy()).done(function (filterprojects, filterreleases)
                //{
                myOnTimeTeam.getNextUsersData(viewModel.users(),viewModel.filterProjectsBy(), viewModel.filterReleasesBy());

                for (var i = 0, l = viewModel.users().length; i < l; i++) {
                    var user = viewModel.users()[i];
                    if (user.visible())
                        myOnTimeTeam.addUserToHandle(viewModel.users()[i], viewModel.filterProjectsBy(), viewModel.filterReleasesBy());
                }

                //});

                ko.applyBindings(viewModel);
            });

            return viewModel;
        },

        addUserToHandle: function (user, filterprojects, filterreleases) {
            if (usersToHandle === null) {
                usersToHandle = [user];
                this.getNextUsersData(filterprojects, filterreleases);
            }
            else {
                usersToHandle.push(user);
            }
        },

        getNextUsersData: function (usersArray, projectFilter, releaseFilter) {

            if (!usersArray)
                return;



            var hiddenUsersArray = window.localStorage.hiddenUsers.split(',');
            var found = false;


            for (var i = 0; i < usersArray.length ; i++) {
                found = false;
                for (var j = 0; j < hiddenUsersArray.length ; j++) {
                    if (hiddenUsersArray[j] === usersArray[i].id.toString())
                        found = true;

                    if (!found || viewModel.showHidden()) {
                        this.getUserData(usersArray[i], projectFilter, releaseFilter);
                    }
                }

            }


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

        getUsersList: function () {
            var querystring = '&extend=all';
            if (window.localStorage.getItem('showInactive') === 'false')
                querystring = '&include_inactive=false' + querystring;


            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('users', querystring), {});
        },

        getItemDetailsForUser: function (itemType, userId, projectId, releaseId) {


            var target = this.getApiUrl(itemType, '&page=1&page_size=0&group_field=assigned_to_name&columns=project,release&user_id=' + userId);

            if (!(projectId === 'nofilter'))//if the ID isn't nofilter
                if (!(typeof projectId === 'undefined'))//if the ID isn't undefined
                    if (!(projectId === '0')) //if the ID isnt 0 for "All Projects"
                        target = target + '&project_id=' + projectId;
            if (!(releaseId === 'nofilter'))//if the ID isn't nofilter
                if (!(typeof releaseId === 'undefined'))//if the ID isn't undefined
                    if (!(releaseId === '0')) //if the ID isnt 0 for "All Releases"
                        target = target + '&release_id=' + releaseId;


            return window.myOnTimeTeam.makeApiCall(target);
        },

        getApiUrl: function (route, queryString) {
            return window.siteRoot + '/ontime/proxy?resource=' + route + (queryString || "");
        },

        getProjects: function () {

            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('projects', ''), {});
        },

        getFilters: function (itemType) {
            var querystring = "&type=" + itemType;
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('filters', querystring), {});
        },


        getReleases: function () {
            return window.myOnTimeTeam.makeApiCall(this.getApiUrl('releases', ''), {});
        },


        makeApiCall: function (url) {
            var deferredResponse = $.Deferred();
            window.myOnTimeTeam.apiQueue.push({
                url: url,
                deferredResponse: deferredResponse
            });




            return deferredResponse;
        },

        processApiQueue: function () {
            var queue = window.myOnTimeTeam.apiQueue;

            if (!queue || !queue.length) return;


            var request = queue.shift();

            $.ajax(request.url, {}).done(function (response) {
                request.deferredResponse.resolve(response);
            });

        },

        apiQueue: []
    };

    window.setInterval(function () {
        myOnTimeTeam.processApiQueue();
    }, 175);



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