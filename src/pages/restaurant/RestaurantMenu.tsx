import { useState } from 'react';
import { useRestaurantMenuItems, useRestaurantMenuCategories } from '@/hooks/useRestaurantData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Utensils, Tag } from 'lucide-react';

export default function RestaurantMenu() {
  const { data: items, isLoading } = useRestaurantMenuItems();
  const { data: categories, create: createCategory } = useRestaurantMenuCategories();
  const { create: createItem } = useRestaurantMenuItems();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [showNewItem, setShowNewItem] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newItem, setNewItem] = useState({ item_name: '', item_name_ar: '', base_price: '', category_id: '', tax_code: 'VAT15', is_recipe_based: false, kitchen_station: '' });
  const [newCat, setNewCat] = useState({ category_name: '', category_name_ar: '' });

  const filtered = (items || []).filter((i: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.item_name?.toLowerCase().includes(q) || i.item_code?.toLowerCase().includes(q);
    const matchCat = catFilter === 'all' || i.category_id === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-sm text-muted-foreground">Categories, items, modifiers, recipes, and pricing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewCat(true)}><Plus className="h-4 w-4 mr-1" /> Category</Button>
          <Button onClick={() => setShowNewItem(true)}><Plus className="h-4 w-4 mr-1" /> Menu Item</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(categories || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.category_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Categories strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(categories || []).map((c: any) => (
          <Badge key={c.id} variant={catFilter === c.id ? 'default' : 'outline'} className="cursor-pointer whitespace-nowrap" onClick={() => setCatFilter(catFilter === c.id ? 'all' : c.id)}>
            <Tag className="h-3 w-3 mr-1" />{c.category_name}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((item: any) => (
          <Card key={item.id} className="border hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Utensils className="h-5 w-5 text-primary" />
                </div>
                <div className="flex gap-1">
                  {item.is_recipe_based && <Badge variant="outline" className="text-[10px]">Recipe</Badge>}
                  <Badge variant={item.is_available ? 'default' : 'secondary'} className="text-[10px]">{item.is_available ? 'Available' : 'Unavailable'}</Badge>
                </div>
              </div>
              <h3 className="font-semibold text-sm">{item.item_name}</h3>
              {item.item_name_ar && <p className="text-xs text-muted-foreground" dir="rtl">{item.item_name_ar}</p>}
              <p className="text-xs text-muted-foreground mt-1">{item.rest_menu_categories?.category_name || 'Uncategorized'}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-bold text-primary">SAR {Number(item.base_price || 0).toFixed(2)}</span>
                {item.kitchen_station && <Badge variant="outline" className="text-[10px]">{item.kitchen_station}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
        {!filtered.length && <p className="col-span-full text-center text-muted-foreground py-8">{isLoading ? 'Loading...' : 'No menu items found'}</p>}
      </div>

      {/* New Item Dialog */}
      <Dialog open={showNewItem} onOpenChange={setShowNewItem}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Menu Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Item Name (EN)</Label><Input value={newItem.item_name} onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} /></div>
            <div><Label>Item Name (AR)</Label><Input value={newItem.item_name_ar} onChange={e => setNewItem({ ...newItem, item_name_ar: e.target.value })} dir="rtl" /></div>
            <div><Label>Category</Label>
              <Select value={newItem.category_id} onValueChange={v => setNewItem({ ...newItem, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{(categories || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.category_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Price (SAR)</Label><Input type="number" value={newItem.base_price} onChange={e => setNewItem({ ...newItem, base_price: e.target.value })} /></div>
            <div><Label>Kitchen Station</Label><Input value={newItem.kitchen_station} onChange={e => setNewItem({ ...newItem, kitchen_station: e.target.value })} placeholder="e.g. Grill, Cold, Pastry" /></div>
            <div className="flex items-center gap-2"><Switch checked={newItem.is_recipe_based} onCheckedChange={v => setNewItem({ ...newItem, is_recipe_based: v })} /><Label>Recipe-based item</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewItem(false)}>Cancel</Button>
            <Button onClick={() => { createItem.mutate({ ...newItem, base_price: parseFloat(newItem.base_price) || 0 }); setShowNewItem(false); }}>Create Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name (EN)</Label><Input value={newCat.category_name} onChange={e => setNewCat({ ...newCat, category_name: e.target.value })} /></div>
            <div><Label>Name (AR)</Label><Input value={newCat.category_name_ar} onChange={e => setNewCat({ ...newCat, category_name_ar: e.target.value })} dir="rtl" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCat(false)}>Cancel</Button>
            <Button onClick={() => { createCategory.mutate(newCat); setShowNewCat(false); setNewCat({ category_name: '', category_name_ar: '' }); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
