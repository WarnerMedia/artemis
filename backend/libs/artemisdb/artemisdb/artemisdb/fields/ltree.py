# MIT License
#
# Copyright (c) 2018 PeopleDoc
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
#
# Source: https://github.com/peopledoc/django-ltree-demo

from django.db import models


class LtreeField(models.TextField):
    description = "ltree"

    def __init__(self, *args, **kwargs):
        kwargs["editable"] = False
        kwargs["null"] = True
        kwargs["default"] = None
        super(LtreeField, self).__init__(*args, **kwargs)

    def db_type(self, connection):
        return "ltree"


class Ancestor(models.Lookup):
    lookup_name = "ancestor"

    def as_sql(self, qn, connection):
        lhs, lhs_params = self.process_lhs(qn, connection)
        rhs, rhs_params = self.process_rhs(qn, connection)
        params = lhs_params + rhs_params
        return "%s @> %s" % (lhs, rhs), params


class Descendant(models.Lookup):
    lookup_name = "descendant"

    def as_sql(self, qn, connection):
        lhs, lhs_params = self.process_lhs(qn, connection)
        rhs, rhs_params = self.process_rhs(qn, connection)
        params = lhs_params + rhs_params
        return "%s <@ %s" % (lhs, rhs), params


LtreeField.register_lookup(Ancestor)
LtreeField.register_lookup(Descendant)


#
# Below here is code that was not originally in the example Ltree implementation
#


class Contains(models.Lookup):
    lookup_name = "contains"

    def as_sql(self, qn, connection):
        lhs, lhs_params = self.process_lhs(qn, connection)
        rhs, rhs_params = self.process_rhs(qn, connection)
        params = lhs_params + rhs_params
        return "%s ~ %s" % (lhs, rhs), params


LtreeField.register_lookup(Contains)
