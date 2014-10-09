/**
    This is the main class of the tool form plugin. It is referenced as 'app' in all lower level modules.
*/
define(['mvc/ui/ui-portlet', 'mvc/ui/ui-misc',
        'mvc/citation/citation-model', 'mvc/citation/citation-view',
        'mvc/tools', 'mvc/tools/tools-template', 'mvc/tools/tools-content', 'mvc/tools/tools-section', 'mvc/tools/tools-tree', 'mvc/tools/tools-jobs'],
    function(Portlet, Ui, CitationModel, CitationView,
             Tools, ToolTemplate, ToolContent, ToolSection, ToolTree, ToolJobs) {

    // create tool model
    var Model = Backbone.Model.extend({
        initialize: function (options) {
            this.url = galaxy_config.root + 'api/tools/' + options.id + '?io_details=true';
        }
    });

    // create form view
    var View = Backbone.View.extend({
        // base element
        container: 'body',
        
        // initialize
        initialize: function(options) {
            // link this
            var self = this;
            
            // link galaxy modal or create one
            if (parent.Galaxy && parent.Galaxy.modal) {
                this.modal = parent.Galaxy.modal;
            } else {
                this.modal = new Ui.Modal.View();
            }
            
            // link options
            this.options = options;
            
            // set element
            this.setElement('<div/>');
            
            // add to main element
            $(this.container).append(this.$el);
            
            // load tool model
            this.model = new Model({
                id      : options.id,
                job_id  : options.job_id
            });
            
            // creates a tree/json structure from the input form
            this.tree = new ToolTree(this);
            
            // creates the job handler
            this.job_handler = new ToolJobs(this);

            // reset field list, which contains the input field elements
            this.field_list = {};
            
            // reset sequential input definition list, which contains the input definitions as provided from the api
            this.input_list = {};
            
            // reset input element list, which contains the dom elements of each input element (includes also the input field)
            this.element_list = {};
            
            // initialize contents
            this.content = new ToolContent({
                history_id  : this.options.history_id,
                success     : function() {
                    self._initializeToolForm();
                }
            });
        },
        
        // message
        message: function($el) {
            $(this.container).empty();
            $(this.container).append($el);
        },
        
        // reset form
        reset: function() {
            for (var i in this.element_list) {
                this.element_list[i].reset();
            }
        },
        
        // refresh
        refresh: function() {
            // recreate tree structure
            this.tree.refresh();
            
            // trigger change
            for (var id in this.field_list) {
                this.field_list[id].trigger('change');
            }
            
            // log
            console.debug('tools-form::refresh() - Recreated data structure. Refresh.');
        },
        
        // initialize tool form
        _initializeToolForm: function() {
            // link this
            var self = this;
            
            // create question button
            var button_question = new Ui.ButtonIcon({
                icon    : 'fa-question-circle',
                title   : 'Question?',
                tooltip : 'Ask a question about this tool (Biostar)',
                onclick : function() {
                    window.open(self.options.biostar_url + '/p/new/post/');
                }
            });
            
            // create search button
            var button_search = new Ui.ButtonIcon({
                icon    : 'fa-search',
                title   : 'Search',
                tooltip : 'Search help for this tool (Biostar)',
                onclick : function() {
                    window.open(self.options.biostar_url + '/t/' + self.options.id + '/');
                }
            });
            
            // create share button
            var button_share = new Ui.ButtonIcon({
                icon    : 'fa-share',
                title   : 'Share',
                tooltip : 'Share this tool',
                onclick : function() {
                    prompt('Copy to clipboard: Ctrl+C, Enter', galaxy_config.root + 'root?tool_id=' + self.options.id);
                }
            });
            
            // default operations
            var operations = {
                button_question: button_question,
                button_search: button_search,
                button_share: button_share
            }
            
            // add admin operations
            if (Galaxy.currUser.get('is_admin')) {
                // create download button
                operations['button_download'] = new Ui.ButtonIcon({
                    icon    : 'fa-download',
                    title   : 'Download',
                    tooltip : 'Download this tool',
                    onclick : function() {
                        window.location.href = galaxy_config.root + 'api/tools/' + self.options.id + '/download';
                    }
                });
            }
            
            // fetch model and render form
            this.model.fetch({
                error: function(response) {
                    console.debug('tools-form::_initializeToolForm() : Attempt to fetch tool model failed.');
                },
                success: function() {
                    // create tool form section
                    self.section = new ToolSection.View(self, {
                        inputs : self.model.get('inputs'),
                        cls    : 'ui-table-plain'
                    });
                    
                    // TEMPORARY SWITCH
                    // switch to classic tool form mako if the form definition is incompatible
                    if (self.incompatible) {
                        self.$el.hide();
                        $('#tool-form-classic').show();
                        return;
                    }
                    
                    // create portlet
                    self.portlet = new Portlet.View({
                        icon : 'fa-wrench',
                        title: '<b>' + self.model.get('name') + '</b> ' + self.model.get('description'),
                        operations: operations,
                        buttons: {
                            execute: new Ui.Button({
                                icon     : 'fa-check',
                                tooltip  : 'Execute the tool',
                                title    : 'Execute',
                                cls      : 'btn btn-primary',
                                floating : 'clear',
                                onclick  : function() {
                                    self.job_handler.submit();
                                }
                            })
                        }
                    });
                    
                    // configure button selection
                    if(!self.options.biostar_url) {
                        button_question.$el.hide();
                        button_search.$el.hide();
                    }
                    
                    // append form
                    self.$el.append(self.portlet.$el);
                    
                    // append help
                    if (self.options.help != '') {
                        self.$el.append(ToolTemplate.help(self.options.help));
                    }
                    
                    // append citations
                    if (self.options.citations) {
                        // append html
                        self.$el.append(ToolTemplate.citations());
            
                        // fetch citations
                        var citations = new CitationModel.ToolCitationCollection();
                        citations.tool_id = self.options.id;
                        var citation_list_view = new CitationView.CitationListView({ collection: citations } );
                        citation_list_view.render();
                        citations.fetch();
                    }
                    
                    // append tool section
                    self.portlet.append(self.section.$el);
                    
                    // trigger refresh
                    self.refresh();
                }
            });
        }
    });

    return {
        View: View
    };
});